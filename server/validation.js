import { z } from "zod";
import { statusLabels } from "../src/lib/requestStatuses.js";
import { parseDate } from "../src/lib/domain.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const requiredText = (max) => z.string().trim().min(1).max(max);
const text = (max) => z.string().trim().max(max);
export const idValue = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
export const email = z.string().trim().toLowerCase().max(150).email();
export const password = z.string().min(14).max(128);
export const revision = z.number().int().min(1);
const sortOrder = z.number().int().min(0).max(10_000);
const priceCents = z.number().int().min(0).max(1_000_000);
export const guestCount = z.number().int().min(1).max(100);
export const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = parseDate(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
export const timeValue = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const statuses = Object.keys(statusLabels);
const httpsUrl = text(900).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
});
const mediaUrl = z.union([z.literal(""), httpsUrl, z.string().regex(/^\/assets\/[a-zA-Z0-9_./-]+$/).refine((value) => !value.includes(".."))]);
const customer = z.object({
  name: requiredText(90),
  email,
  phone: text(35).default(""),
});
const line = z.object({ menuItemId: idValue, quantity: z.number().int().min(1).max(20) });
const lines = z.array(line).max(40).refine(
  (items) => new Set(items.map((item) => item.menuItemId)).size === items.length,
  "Ogni prodotto può comparire solo una volta.",
).transform((items) => items.sort((a, b) => a.menuItemId.localeCompare(b.menuItemId)));

export const bookingInput = z.object({
  date: dateValue, time: timeValue, timeZone: z.literal("Europe/Rome"),
  guestCount, customer, notes: text(700).default(""), menuPreferences: lines.default([]),
});
export const orderInput = z.object({
  type: z.literal("menu_inquiry"), customer, notes: text(700).default(""),
  items: lines.refine((value) => value.length > 0, "Scegli almeno un prodotto."),
});
export const requestUpdate = z.object({
  revision, status: z.enum(statuses), customer, notes: text(700).default(""),
  date: dateValue.optional(), time: timeValue.optional(), guestCount: guestCount.optional(),
});
export const categoryInput = z.object({ name: requiredText(70), sortOrder, archived: z.boolean() });
export const productInput = z.object({
  categoryId: idValue, name: requiredText(100), description: text(700), priceCents,
  imageUrl: mediaUrl, videoUrl: mediaUrl, allergens: z.array(requiredText(45)).max(20),
  available: z.boolean(), sortOrder, archived: z.boolean(),
  photoData: z.string().max(1_600_000).regex(/^[a-zA-Z0-9+/]+={0,2}$/).optional(),
  removePhoto: z.boolean().optional(),
});
export const bookingRules = z.object({
  timeZone: z.literal("Europe/Rome"),
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(6),
  maxGuests: guestCount, horizonDays: z.number().int().min(1).max(365),
  minLeadMinutes: z.number().int().min(0).max(1440),
  slots: z.array(timeValue).min(1).max(48),
  hoursLabel: requiredText(90), hours: requiredText(90), closedLabel: requiredText(90),
  closedDates: z.array(dateValue).max(180).default([]),
  capacityPerSlot: z.number().int().min(1).max(1000).nullable().default(null),
}).transform((rules) => ({
  ...rules,
  slots: [...new Set(rules.slots)].sort(),
  closedWeekdays: [...new Set(rules.closedWeekdays)].sort(),
  closedDates: [...new Set(rules.closedDates)].sort(),
}));
const story = z.object({
  eyebrow: requiredText(80), heading: z.array(requiredText(120)).min(1).max(4),
  emphasis: requiredText(120), paragraphs: z.array(requiredText(900)).min(1).max(6),
});
export const settingsInput = z.object({
  revision, live: z.boolean(), booking: bookingRules,
  content: z.object({
    contact: z.object({
      address: requiredText(170), district: requiredText(80),
      phone: z.string().regex(/^\+\d{7,16}$/), phoneLabel: requiredText(45),
      instagram: httpsUrl, instagramLabel: requiredText(70), directions: httpsUrl,
    }),
    hero: z.object({
      eyebrow: requiredText(100), heading: requiredText(100),
      emphasis: requiredText(100), description: requiredText(420),
    }),
    story,
    family: story,
  }),
});
export const listQuery = z.object({
  status: z.enum(statuses).optional(), date: dateValue.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue.path.join(".");
  throw new ApiError(400, field ? `Controlla il campo «${field}».` : "Controlla i dati inseriti.");
}

export async function readJson(c, schema) {
  if (!/^application\/json(?:;|$)/i.test(c.req.header("content-type") || "")) {
    throw new ApiError(415, "Invia i dati come JSON.");
  }
  const payload = await c.req.json().catch(() => { throw new ApiError(400, "Dati JSON non validi."); });
  return parse(schema, payload);
}
