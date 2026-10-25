// Public API boundary. Admin credentials never belong in this frontend.
const mode = import.meta.env.VITE_DATA_MODE || "demo";
export const apiEnabled = mode === "api";
const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  if (!apiEnabled || !baseUrl)
    throw new Error(
      "Il servizio di prenotazione non è ancora collegato. Contattaci al telefono.",
    );
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: options.signal || AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      payload?.message || "Il servizio non è disponibile. Riprova o chiamaci.",
    );
  if (!payload || typeof payload !== "object")
    throw new Error("Risposta del servizio non valida. Riprova o chiamaci.");
  return payload;
}

export async function loadPublicContent(signal) {
  const content = await request("/public/content", { signal });
  if (
    content.schemaVersion !== 1 ||
    typeof content.preview !== "boolean" ||
    !content.brand?.name ||
    !content.contact?.phone ||
    !content.hero?.scenes?.length ||
    !content.wineMoods?.length ||
    !content.booking?.slots?.length ||
    !Array.isArray(content.categories) ||
    !Array.isArray(content.menu)
  ) {
    throw new Error(
      "Il contenuto del locale non è completo. Riprova tra poco.",
    );
  }
  if (
    content.menu.some(
      (item) =>
        !item.id || !Number.isInteger(item.priceCents) || item.priceCents < 0,
    )
  ) {
    throw new Error("Il menu non è disponibile al momento.");
  }
  return content;
}

function submission(path, payload, idempotencyKey) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export const createBooking = (payload, key) =>
  submission("/public/bookings", payload, key);
export const createOrder = (payload, key) =>
  submission("/public/orders", payload, key);
