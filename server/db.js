import { Pool } from "pg";
import { demoSite } from "../src/data/site.js";
import { schema } from "./schema.js";
import { isPasswordHash } from "./passwords.js";

const lock = 294;
export const json = (value) => JSON.stringify(value);

export function postgresDatabase(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 10_000,
  });
  pool.on("error", (error) => console.error("Spargolo database pool error", error.code));
  return {
    query: (sql, args) => pool.query(sql, args),
    async transaction(operation) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function seedCatalog(tx) {
  for (const [index, category] of demoSite.categories.entries()) {
    await tx.query(
      "INSERT INTO menu_categories (id, name, sort_order) VALUES ($1, $2, $3)",
      [category.id, category.name, index * 10],
    );
  }

  for (const [index, item] of demoSite.menu.entries()) {
    await tx.query(
      `INSERT INTO menu_items
        (id, category_id, name, description, price_cents, image_url, video_url, available, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [item.id, item.categoryId, item.name, item.description, item.priceCents,
        item.image || "", item.video || "", item.available, index * 10],
    );
  }
}

export async function initializeDatabase(db, env = {}) {
  const email = env.SPARGOLO_ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = env.SPARGOLO_ADMIN_PASSWORD_HASH;
  if ((email || passwordHash) && (!email || !isPasswordHash(passwordHash))) {
    throw new Error("Set both SPARGOLO_ADMIN_EMAIL and a generated SPARGOLO_ADMIN_PASSWORD_HASH.");
  }

  await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1)", [lock]);
    if (tx.exec) await tx.exec(schema);
    else await tx.query(schema);

    const initial = await tx.query(
      "INSERT INTO venue_settings (id, booking) VALUES (1, $1::jsonb) ON CONFLICT DO NOTHING RETURNING id",
      [json({ ...demoSite.booking, closedDates: [], capacityPerSlot: null })],
    );
    if (initial.rows.length) await seedCatalog(tx);

    if (email) {
      await tx.query(
        "INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [email, passwordHash],
      );
    }
  });
}
