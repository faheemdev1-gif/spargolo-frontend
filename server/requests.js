import { randomUUID } from "node:crypto";
import { availableSlots, isBookableDate, venueNow } from "../src/lib/domain.js";
import { statusTransitions } from "../src/lib/requestStatuses.js";
import { getSettings, staleRecord } from "./catalog.js";
import { json } from "./db.js";
import { digest } from "./passwords.js";
import { ApiError } from "./validation.js";

const requestFields = `id, kind, status, customer, notes, items, total_cents AS "totalCents",
  service_date AS date, service_time AS time, guests AS "guestCount", time_zone AS "timeZone",
  revision, created_at AS "createdAt", updated_at AS "updatedAt"`;

function checkSlot(booking, rules, staff) {
  const now = new Date();
  const current = venueNow(now, rules.timeZone);
  const [hours, minutes] = booking.time.split(":").map(Number);
  const validSlot = staff
    ? isBookableDate(booking.date, rules, now) && rules.slots.includes(booking.time)
      && (booking.date !== current.date || hours * 60 + minutes >= current.minutes)
    : availableSlots(booking.date, rules, now).includes(booking.time);
  if (!validSlot || booking.guestCount > rules.maxGuests) {
    throw new ApiError(422, "Controlla disponibilità, orario e numero di persone.");
  }
}

async function priceItems(tx, items) {
  if (!items.length) return [];
  const { rows } = await tx.query(
    `SELECT i.id, i.name, i.price_cents AS "priceCents" FROM menu_items i
     JOIN menu_categories c ON c.id = i.category_id
     WHERE i.id = ANY($1::text[]) AND i.available AND NOT i.archived AND NOT c.archived
     ORDER BY i.id FOR SHARE OF i, c`,
    [items.map((item) => item.menuItemId)],
  );
  const menu = new Map(rows.map((item) => [item.id, item]));
  return items.map(({ menuItemId, quantity }) => {
    const item = menu.get(menuItemId);
    if (!item) throw new ApiError(422, "Un prodotto selezionato non è più disponibile. Aggiorna il menu.");
    return { menuItemId, name: item.name, priceCents: item.priceCents, quantity };
  });
}

async function addEvent(tx, id, action, actor, details) {
  await tx.query(
    "INSERT INTO request_events (request_id, action, actor, details) VALUES ($1, $2, $3, $4::jsonb)",
    [id, action, actor, json(details)],
  );
}

export async function submitRequest(db, kind, body, key, actor = null) {
  const signature = digest(json(body));
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`spargolo:${kind}:${key}`]);
    const existing = (await tx.query(
      "SELECT id, request_hash FROM guest_requests WHERE kind = $1 AND request_key = $2",
      [kind, key],
    )).rows[0];
    if (existing) {
      if (existing.request_hash !== signature) throw new ApiError(409, "La chiave di invio è già stata usata con dati diversi.");
      return { record: { id: existing.id, status: "pending" }, status: 200 };
    }

    const settings = await getSettings(tx, "FOR SHARE");
    if (!actor && !settings.live) throw new ApiError(403, "Il locale non riceve ancora richieste online.");
    const booking = kind === "booking" ? body : null;
    if (booking) checkSlot(booking, settings.booking, Boolean(actor));

    const items = await priceItems(tx, booking ? body.menuPreferences : body.items);
    const totalCents = kind === "order" ? items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0) : 0;
    const id = randomUUID();
    await tx.query(
      `INSERT INTO guest_requests (id, kind, customer, notes, items, total_cents,
       service_date, service_time, guests, time_zone, request_key, request_hash)
       VALUES ($1,$2,$3::jsonb,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12)`,
      [id, kind, json(body.customer), body.notes, json(items), totalCents,
        booking?.date ?? null, booking?.time ?? null, booking?.guestCount ?? null, booking?.timeZone ?? null,
        key, signature],
    );
    await addEvent(tx, id, "created", actor, { status: "pending" });
    return { record: { id, status: "pending" }, status: 201 };
  });
}

export async function listRequests(db, kind, { status, date, page }) {
  const pageSize = 25;
  const { rows } = await db.query(
    `SELECT ${requestFields} FROM guest_requests WHERE kind = $1
     AND ($2::text IS NULL OR status = $2) AND ($3::text IS NULL OR service_date = $3)
     ORDER BY created_at DESC, id DESC LIMIT $4 OFFSET $5`,
    [kind, status ?? null, date ?? null, pageSize + 1, (page - 1) * pageSize],
  );
  return { records: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function getRequest(db, kind, id) {
  const { rows: [record] } = await db.query(
    `SELECT ${requestFields} FROM guest_requests WHERE id = $1 AND kind = $2`, [id, kind],
  );
  if (!record) throw new ApiError(404, "Richiesta non trovata.");
  const { rows: history } = await db.query(
    'SELECT id, action, actor, details, created_at AS "createdAt" FROM request_events WHERE request_id = $1 ORDER BY id DESC',
    [id],
  );
  return { ...record, history };
}

export async function updateRequest(db, kind, id, input, actor) {
  await db.transaction(async (tx) => {
    const settings = await getSettings(tx, "FOR UPDATE");
    const { rows: [previous] } = await tx.query(
      `SELECT ${requestFields} FROM guest_requests WHERE kind = $1 AND id = $2 FOR UPDATE`, [kind, id],
    );
    if (!previous) throw new ApiError(404, "Richiesta non trovata.");
    if (previous.revision !== input.revision) throw staleRecord();
    if (previous.status !== input.status && !statusTransitions[previous.status].includes(input.status)) {
      throw new ApiError(409, "Cambio di stato non consentito.");
    }
    const date = kind === "booking" ? input.date ?? previous.date : null;
    const time = kind === "booking" ? input.time ?? previous.time : null;
    const guests = kind === "booking" ? input.guestCount ?? previous.guestCount : null;
    const scheduleChanged = date !== previous.date || time !== previous.time || guests !== previous.guestCount;
    const confirming = previous.status !== "confirmed" && input.status === "confirmed";
    if (kind === "booking" && (scheduleChanged || confirming)) {
      checkSlot({ date, time, guestCount: guests }, settings.booking, true);
      const capacity = settings.booking.capacityPerSlot;
      if (input.status === "confirmed" && capacity !== null) {
        const { rows: [{ occupied }] } = await tx.query(
          `SELECT COALESCE(SUM(guests), 0)::int AS occupied FROM guest_requests
           WHERE kind = 'booking' AND status = 'confirmed' AND service_date = $1 AND service_time = $2 AND id <> $3`,
          [date, time, id],
        );
        if (occupied + guests > capacity) throw new ApiError(409, "Non ci sono abbastanza posti in questa fascia.");
      }
    }
    await tx.query(
      `UPDATE guest_requests SET status=$1, customer=$2::jsonb, notes=$3, service_date=$4,
       service_time=$5, guests=$6, revision=revision+1, updated_at=now() WHERE id=$7`,
      [input.status, json(input.customer), input.notes, date, time, guests, id],
    );
    await addEvent(tx, id, scheduleChanged ? "rescheduled" : "updated", actor,
      { previousStatus: previous.status, status: input.status, date, time, guestCount: guests });
  });
  return getRequest(db, kind, id);
}
