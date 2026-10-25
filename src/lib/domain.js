export function money(cents) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function cartLines(cart, menu) {
  return menu
    .filter(
      (item) =>
        item.available && Number.isInteger(cart[item.id]) && cart[item.id] > 0,
    )
    .map((item) => ({ ...item, quantity: Math.min(cart[item.id], 20) }));
}

export function cartTotal(lines) {
  return lines.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
}

export function changeQuantity(cart, id, delta, menu) {
  if (!menu.some((item) => item.id === id && item.available)) return cart;
  const next = { ...cart };
  const quantity = Math.min(20, Math.max(0, (next[id] || 0) + delta));
  if (quantity) next[id] = quantity;
  else delete next[id];
  return next;
}

export function venueNow(now = new Date(), timeZone = "Europe/Rome") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (key) => parts.find((p) => p.type === key).value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function parseDate(key) {
  return new Date(`${key}T12:00:00Z`);
}

export function addDays(key, count) {
  const date = parseDate(key);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function formatDate(key) {
  return key
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "long",
      }).format(parseDate(key))
    : "";
}

export function isBookableDate(key, rules, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) return false;
  const date = parseDate(key);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key
  )
    return false;
  const today = venueNow(now, rules.timeZone).date;
  return (
    key >= today &&
    key <= addDays(today, rules.horizonDays) &&
    !rules.closedWeekdays.includes(date.getUTCDay())
  );
}

export function availableSlots(key, rules, now = new Date()) {
  if (!isBookableDate(key, rules, now)) return [];
  const current = venueNow(now, rules.timeZone);
  return rules.slots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return (
      key !== current.date ||
      h * 60 + m >= current.minutes + rules.minLeadMinutes
    );
  });
}

export function bookingPayload(values, lines, rules, now = new Date()) {
  if (
    !isBookableDate(values.date, rules, now) ||
    !availableSlots(values.date, rules, now).includes(values.time)
  ) {
    throw new Error("Scegli una nuova data o un nuovo orario.");
  }
  if (
    !Number.isInteger(values.guests) ||
    values.guests < 1 ||
    values.guests > rules.maxGuests
  ) {
    throw new Error("Controlla il numero di persone.");
  }
  const customer = customerPayload(values);
  return {
    date: values.date,
    time: values.time,
    timeZone: rules.timeZone,
    guestCount: values.guests,
    customer,
    notes: (values.notes || "").trim(),
    menuPreferences: lines.map(({ id, quantity }) => ({
      menuItemId: id,
      quantity,
    })),
  };
}

export function customerPayload(values) {
  const name = (values.name || "").trim();
  const email = (values.email || "").trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Controlla nome e indirizzo email.");
  return { name, email, phone: (values.phone || "").trim() };
}

export function orderPayload(values, lines) {
  if (!lines.length) throw new Error("La selezione è vuota.");
  return {
    type: "menu_inquiry",
    customer: customerPayload(values),
    notes: (values.notes || "").trim(),
    items: lines.map(({ id, quantity }) => ({ menuItemId: id, quantity })),
  };
}
