import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.js";
import { initializeDatabase } from "../server/db.js";
import { embeddedDatabase } from "../server/local.js";
import { hashPassword } from "../server/passwords.js";
import { addDays, isBookableDate, venueNow } from "../src/lib/domain.js";

let db;
let app;
let cookie;
let category;
let item;
let settings;
const credentials = { email: "owner@example.test", password: "integration-only-owner-password" };
const customer = { name: "Test Guest", email: "guest@example.test", phone: "" };

async function request(path, { method = "GET", body, session = false, key, origin } = {}) {
  const headers = new Headers();
  if (session) headers.set("Cookie", cookie);
  if (key) headers.set("Idempotency-Key", key);
  if (origin) headers.set("Origin", origin);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await app.request(`/api/v1${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, status: response.status, body: await response.json().catch(() => null) };
}

function expectStatus(result, status) {
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}

before(async () => {
  db = await embeddedDatabase();
  await initializeDatabase(db, {
    SPARGOLO_ADMIN_EMAIL: credentials.email,
    SPARGOLO_ADMIN_PASSWORD_HASH: await hashPassword(credentials.password),
  });
  app = createApp(() => db);
});

after(async () => db?.close());

test("public demo is usable and the admin requires a same-origin authenticated session", async () => {
  const content = expectStatus(await request("/public/content"), 200);
  assert.equal(content.preview, true);
  assert.ok(content.menu.length > 0);
  expectStatus(await request("/admin/catalog"), 401);
  expectStatus(await request("/public/orders", {
    method: "POST", key: randomUUID(), body: {
      type: "menu_inquiry", customer, items: [{ menuItemId: "c1", quantity: 1 }],
    },
  }), 403);
  expectStatus(await request("/admin/login", { method: "POST", body: credentials, origin: "https://different.example" }), 403);
  expectStatus(await request("/admin/login", { method: "POST", body: { ...credentials, password: "wrong" } }), 401);
  const login = await request("/admin/login", { method: "POST", body: credentials });
  expectStatus(login, 200);
  const header = login.response.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Strict/i);
  cookie = header.split(";")[0];
  expectStatus(await request("/admin/catalog", { session: true }), 200);
});

test("categories and products can be added, edited, archived, and published with photos", async () => {
  category = expectStatus(await request("/admin/categories", {
    method: "POST", session: true, body: { name: "Dolci di prova", sortOrder: 80, archived: false },
  }), 201);
  expectStatus(await request("/admin/categories", {
    method: "POST", session: true, body: { name: "DOLCI DI PROVA", sortOrder: 81, archived: false },
  }), 409);
  const photoData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVFcAAAAASUVORK5CYII=";
  item = expectStatus(await request("/admin/products", { method: "POST", session: true, body: {
    categoryId: category.id, name: "Torta di prova", description: "Cioccolato",
    priceCents: 690, imageUrl: "", videoUrl: "", allergens: ["Latte"], available: true,
    sortOrder: 10, archived: false, photoData,
  } }), 201);
  assert.equal(item.priceCents, 690);
  const photo = await app.request(item.image);
  assert.equal(photo.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), Buffer.from(photoData, "base64"));
  let content = expectStatus(await request("/public/content"), 200);
  assert.equal(content.menu.find(({ id }) => id === item.id).name, item.name);
  const stale = { ...category, name: "Dolci del giorno", archived: true };
  category = expectStatus(await request(`/admin/categories/${category.id}`, { method: "PATCH", session: true, body: stale }), 200);
  expectStatus(await request(`/admin/categories/${category.id}`, { method: "PATCH", session: true, body: stale }), 409);
  content = expectStatus(await request("/public/content"), 200);
  assert.equal(content.categories.some(({ id }) => id === category.id), false);
  assert.equal(content.menu.some(({ id }) => id === item.id), false);
  category = expectStatus(await request(`/admin/categories/${category.id}`, { method: "PATCH", session: true, body: { ...category, archived: false } }), 200);
});

test("customer requests use current prices, preserve snapshots and make retries safe", async () => {
  const current = expectStatus(await request("/admin/settings", { session: true }), 200);
  settings = expectStatus(await request("/admin/settings", {
    method: "PUT", session: true, body: { ...current, live: true, booking: { ...current.booking, capacityPerSlot: 4 } },
  }), 200);
  assert.equal(expectStatus(await request("/public/content"), 200).preview, false);
  const key = randomUUID();
  const order = { type: "menu_inquiry", customer, items: [{ menuItemId: item.id, quantity: 2, priceCents: 1 }] };
  const submitted = await Promise.all([0, 1].map(() => request("/public/orders", { method: "POST", key, body: order })));
  assert.deepEqual(submitted.map(({ status }) => status).sort(), [200, 201]);
  assert.equal(submitted[0].body.id, submitted[1].body.id);
  const id = submitted[0].body.id;
  expectStatus(await request("/public/orders", { method: "POST", key, body: { ...order, notes: "Changed" } }), 409);

  item = expectStatus(await request(`/admin/products/${item.id}`, { method: "PATCH", session: true,
    body: { ...item, priceCents: 800, available: false },
  }), 200);
  expectStatus(await request("/public/orders", { method: "POST", key: randomUUID(), body: order }), 422);
  const record = expectStatus(await request(`/admin/orders/${id}`, { session: true }), 200);
  assert.equal(record.totalCents, 1380);
  assert.equal(record.items[0].priceCents, 690);
  assert.equal(record.history.length, 1);
  expectStatus(await request("/admin/orders?status=pending&page=1", { session: true }), 200);
});

test("reservations start pending and confirmation enforces a configured slot limit", async () => {
  const today = venueNow().date;
  const date = [1, 2, 3, 4, 5, 6, 7].map((days) => addDays(today, days))
    .find((day) => isBookableDate(day, settings.booking));
  const booking = { date, time: "19:00", timeZone: "Europe/Rome", guestCount: 3, customer };
  const records = await Promise.all([0, 1].map(async () => expectStatus(await request("/public/bookings", {
    method: "POST", key: randomUUID(), body: booking,
  }), 201)));
  assert.ok(records.every((record) => record.status === "pending"));
  const confirmations = await Promise.all(records.map((record) => request(`/admin/bookings/${record.id}`, {
    method: "PATCH", session: true, body: { ...booking, revision: 1, status: "confirmed" },
  })));
  assert.deepEqual(confirmations.map(({ status }) => status).sort(), [200, 409]);
  const list = expectStatus(await request(`/admin/bookings?date=${date}&status=confirmed`, { session: true }), 200);
  assert.equal(list.records.length, 1);
  expectStatus(await request(`/admin/bookings/${list.records[0].id}`, {
    method: "PATCH", session: true, body: { ...booking, revision: 1, status: "cancelled" },
  }), 409);
  settings = expectStatus(await request("/admin/settings", { method: "PUT", session: true,
    body: { ...settings, booking: { ...settings.booking, closedDates: [date] } },
  }), 200);
  expectStatus(await request("/public/bookings", { method: "POST", key: randomUUID(), body: booking }), 422);
});

test("changing a password revokes active sessions", async () => {
  const next = "integration-only-new-password";
  expectStatus(await request("/admin/password", { method: "POST", session: true,
    body: { currentPassword: credentials.password, newPassword: next },
  }), 200);
  expectStatus(await request("/admin/session", { session: true }), 401);
  expectStatus(await request("/admin/login", { method: "POST", body: credentials }), 401);
  expectStatus(await request("/admin/login", { method: "POST", body: { ...credentials, password: next } }), 200);
});
