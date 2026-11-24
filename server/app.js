import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { adminSettings, getCatalog, getPhoto, publicContent, saveCategory, saveProduct, saveSettings } from "./catalog.js";
import { changePassword, getSession, rateLimit, signIn, signOut } from "./auth.js";
import { getRequest, listRequests, submitRequest, updateRequest } from "./requests.js";
import {
  ApiError, bookingInput, categoryInput, email, idValue, listQuery, orderInput, parse,
  password, productInput, readJson, requestUpdate, revision, settingsInput,
} from "./validation.js";

const loginInput = z.object({ email, password: z.string().min(1).max(128) });
const passwordUpdate = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
const keyPattern = /^[a-zA-Z0-9_-]{16,100}$/;

function requireDatabase(c) {
  const db = c.get("db");
  if (!db) throw new ApiError(503, "Il servizio non è ancora configurato.");
  return db;
}

function sameOrigin(c) {
  const site = c.req.header("sec-fetch-site");
  const origin = c.req.header("origin");
  return (!site || site === "same-origin" || site === "none")
    && (!origin || origin === new URL(c.req.url).origin);
}

export function createApp(getDatabase, { secureCookies = false, clientIp = () => "local" } = {}) {
  const app = new Hono().basePath("/api/v1");
  app.onError((error, c) => {
    if (error instanceof ApiError) return c.json({ message: error.message }, error.status);
    if (error.code === "23505") return c.json({ message: "Esiste già un record con questi dati." }, 409);
    console.error("Spargolo API error", error.code || error.name);
    return c.json({ message: "Il servizio non è disponibile. Riprova tra poco." }, 500);
  });
  app.notFound((c) => c.json({ message: "Percorso non trovato." }, 404));

  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !sameOrigin(c)) {
      throw new ApiError(403, "Origine della richiesta non consentita.");
    }
    await next();
  });
  app.use("*", bodyLimit({
    maxSize: 1_750_000,
    onError: (c) => c.json({ message: "La richiesta è troppo grande." }, 413),
  }));
  app.use("*", async (c, next) => {
    c.set("db", await getDatabase());
    await next();
  });

  app.get("/public/content", async (c) => c.json(await publicContent(c.get("db"))));
  app.get("/photos/:id", async (c) => {
    const photo = await getPhoto(requireDatabase(c), parse(idValue, c.req.param("id")));
    c.header("Cache-Control", "public, max-age=86400, immutable");
    c.header("Content-Type", photo.content_type);
    return c.body(new Uint8Array(photo.data));
  });

  const handleSubmission = (kind, schema, actor = null) => async (c) => {
    const db = requireDatabase(c);
    const key = c.req.header("Idempotency-Key");
    if (!key || !keyPattern.test(key)) throw new ApiError(400, "Chiave di invio non valida.");
    if (!actor) await rateLimit(db, "guest-requests", clientIp(c), 36, 3600);
    const input = await readJson(c, schema);
    const result = await submitRequest(db, kind, input, key, actor ? c.get("session").email : null);
    return c.json(result.record, result.status);
  };

  app.post("/public/bookings", handleSubmission("booking", bookingInput));
  app.post("/public/orders", handleSubmission("order", orderInput));

  app.post("/admin/login", async (c) => {
    const db = requireDatabase(c);
    await rateLimit(db, "sign-in", clientIp(c), 15, 900);
    const values = await readJson(c, loginInput);
    return c.json(await signIn(c, db, values, secureCookies));
  });
  app.post("/admin/logout", async (c) => {
    await signOut(c, requireDatabase(c), secureCookies);
    return c.json({ ok: true });
  });

  app.use("/admin/*", async (c, next) => {
    c.set("session", await getSession(c, requireDatabase(c), secureCookies));
    await next();
  });
  app.get("/admin/session", (c) => c.json({ email: c.get("session").email }));
  app.post("/admin/password", async (c) => {
    const db = requireDatabase(c);
    const session = c.get("session");
    await rateLimit(db, "change-password", session.email, 10, 900);
    await changePassword(c, db, session, await readJson(c, passwordUpdate), secureCookies);
    return c.json({ ok: true });
  });

  app.get("/admin/catalog", async (c) => c.json(await getCatalog(requireDatabase(c))));
  for (const [resource, schema, save] of [
    ["categories", categoryInput, saveCategory],
    ["products", productInput, saveProduct],
  ]) {
    app.post(`/admin/${resource}`, async (c) => c.json(
      await save(requireDatabase(c), await readJson(c, schema)), 201,
    ));
    app.patch(`/admin/${resource}/:id`, async (c) => c.json(
      await save(requireDatabase(c), await readJson(c, schema.extend({ revision })), parse(idValue, c.req.param("id"))),
    ));
  }
  app.get("/admin/settings", async (c) => c.json(await adminSettings(requireDatabase(c))));
  app.put("/admin/settings", async (c) => c.json(await saveSettings(requireDatabase(c), await readJson(c, settingsInput))));

  for (const [resource, kind, schema] of [["bookings", "booking", bookingInput], ["orders", "order", orderInput]]) {
    app.get(`/admin/${resource}`, async (c) => c.json(
      await listRequests(requireDatabase(c), kind, parse(listQuery, c.req.query())),
    ));
    app.post(`/admin/${resource}`, handleSubmission(kind, schema, true));
    app.get(`/admin/${resource}/:id`, async (c) => c.json(
      await getRequest(requireDatabase(c), kind, parse(idValue, c.req.param("id"))),
    ));
    app.patch(`/admin/${resource}/:id`, async (c) => c.json(
      await updateRequest(requireDatabase(c), kind, parse(idValue, c.req.param("id")),
        await readJson(c, requestUpdate), c.get("session").email),
    ));
  }

  return app;
}
