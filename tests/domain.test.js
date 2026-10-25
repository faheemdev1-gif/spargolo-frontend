import test from "node:test";
import assert from "node:assert/strict";
import { demoSite } from "../src/data/site.js";
import {
  addDays,
  availableSlots,
  bookingPayload,
  cartLines,
  cartTotal,
  changeQuantity,
  isBookableDate,
  orderPayload,
  venueNow,
} from "../src/lib/domain.js";

const rules = demoSite.booking;
const now = new Date("2026-10-25T10:00:00Z");

test("selection counts quantities, ignores unknown items and unavailable dishes, and totals integer cents", () => {
  const menu = [
    ...demoSite.menu,
    { id: "sold-out", priceCents: 500, available: false },
  ];
  const lines = cartLines({ c1: 2, c2: 3, missing: 8, "sold-out": 1 }, menu);
  assert.equal(lines.length, 2);
  assert.equal(cartTotal(lines), 2100);
  assert.equal(cartTotal(cartLines({ c1: 0.5 }, menu)), 0);
});

test("quantities are bounded and removing the last serving removes the item", () => {
  assert.deepEqual(changeQuantity({ c1: 1 }, "c1", -1, demoSite.menu), {});
  assert.deepEqual(changeQuantity({ c1: 20 }, "c1", 1, demoSite.menu), {
    c1: 20,
  });
  assert.deepEqual(changeQuantity({}, "unknown", 1, demoSite.menu), {});
});

test("venue date arithmetic stays correct across the Rome daylight-saving change", () => {
  assert.equal(venueNow(new Date("2026-10-24T22:30:00Z")).date, "2026-10-25");
  assert.equal(venueNow(new Date("2026-10-25T00:30:00Z")).minutes, 150);
  assert.equal(venueNow(new Date("2026-10-25T01:30:00Z")).minutes, 150);
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
});

test("booking excludes past dates, Mondays, invalid dates, and dates beyond the horizon", () => {
  assert.equal(isBookableDate("2026-10-24", rules, now), false);
  assert.equal(isBookableDate("2026-10-26", rules, now), false);
  assert.equal(isBookableDate("2026-02-30", rules, now), false);
  assert.equal(isBookableDate("2027-05-01", rules, now), false);
  assert.equal(isBookableDate("2026-10-27", rules, now), true);
});

test("same-day slots respect venue time and lead time", () => {
  const evening = new Date("2026-10-25T18:10:00Z"); // 19:10 in Milan
  assert.deepEqual(availableSlots("2026-10-25", rules, evening), [
    "20:00",
    "20:30",
    "21:00",
    "21:30",
  ]);
  assert.deepEqual(availableSlots("2026-10-26", rules, evening), []);
});

test("booking includes selected menu preferences and rejects a date that has closed", () => {
  const values = {
    date: "2026-10-27",
    time: "19:30",
    guests: 4,
    name: " Demo Guest ",
    email: "demo@example.com",
    phone: "",
    notes: " A note ",
  };
  const payload = bookingPayload(
    values,
    cartLines({ c1: 2 }, demoSite.menu),
    rules,
    now,
  );
  assert.equal(payload.customer.name, "Demo Guest");
  assert.equal(payload.notes, "A note");
  assert.equal(payload.timeZone, "Europe/Rome");
  assert.deepEqual(payload.menuPreferences, [
    { menuItemId: "c1", quantity: 2 },
  ]);
  assert.throws(() =>
    bookingPayload({ ...values, date: "2026-10-26" }, [], rules, now),
  );
  assert.throws(() => bookingPayload({ ...values, guests: 0 }, [], rules, now));
});

test("order request sends IDs and quantities, with prices left to the server", () => {
  const values = {
    name: "Demo Guest",
    email: "demo@example.com",
    phone: "",
    notes: "",
  };
  const payload = orderPayload(values, cartLines({ c1: 2 }, demoSite.menu));
  assert.deepEqual(payload.items, [{ menuItemId: "c1", quantity: 2 }]);
  assert.equal("total" in payload, false);
  assert.equal("priceCents" in payload.items[0], false);
  assert.throws(() => orderPayload(values, []));
  assert.throws(() =>
    orderPayload(
      { ...values, name: "   " },
      cartLines({ c1: 1 }, demoSite.menu),
    ),
  );
});
