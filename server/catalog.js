import { randomUUID } from "node:crypto";
import { demoSite } from "../src/data/site.js";
import { json } from "./db.js";
import { ApiError } from "./validation.js";

export async function getSettings(db, lock = "") {
  const { rows: [settings] } = await db.query(
    `SELECT live, booking, content, revision FROM venue_settings WHERE id = 1 ${lock}`,
  );
  return settings;
}

function applyContent(content) {
  return {
    contact: { ...demoSite.contact, ...content.contact },
    hero: { ...demoSite.hero, ...content.hero },
    story: { ...demoSite.story, ...content.story },
    family: { ...demoSite.family, ...content.family },
  };
}

export async function adminSettings(db) {
  const settings = await getSettings(db);
  return { ...settings, content: applyContent(settings.content) };
}

export async function saveSettings(db, settings) {
  const { rows } = await db.query(
    `UPDATE venue_settings SET live = $1, booking = $2::jsonb, content = $3::jsonb, revision = revision + 1
     WHERE id = 1 AND revision = $4 RETURNING revision`,
    [settings.live, json(settings.booking), json(settings.content), settings.revision],
  );
  if (!rows.length) throw staleRecord();
  return { ...settings, revision: rows[0].revision, content: applyContent(settings.content) };
}

const categoryFields = 'id, name, sort_order AS "sortOrder", archived, revision';
const itemFields = `i.id, i.category_id AS "categoryId", i.name, i.description,
  i.price_cents AS "priceCents", i.image_url AS "imageUrl", i.photo_id AS "photoId",
  i.video_url AS "videoUrl", i.allergens, i.available, i.sort_order AS "sortOrder",
  i.archived, i.revision`;

function productImage(item) {
  return item.photoId ? `/api/v1/photos/${item.photoId}` : item.imageUrl;
}

export async function getCatalog(db, publicOnly = false) {
  const categories = await db.query(
    `SELECT ${categoryFields} FROM menu_categories ${publicOnly ? "WHERE NOT archived" : ""}
     ORDER BY sort_order, name, id`,
  );
  const items = await db.query(
    `SELECT ${itemFields} FROM menu_items i JOIN menu_categories c ON i.category_id = c.id
     ${publicOnly ? "WHERE NOT i.archived AND NOT c.archived" : ""}
     ORDER BY c.sort_order, i.sort_order, i.name, i.id`,
  );
  return { categories: categories.rows, products: items.rows.map((item) => ({
    ...item, image: productImage(item),
  })) };
}

export async function publicContent(db) {
  if (!db) return demoSite;
  const [settings, catalog] = await Promise.all([getSettings(db), getCatalog(db, true)]);
  const categories = catalog.categories.map(({ id, name }) => ({ id, name }));
  const categoryIds = new Set(categories.map(({ id }) => id));
  const menu = catalog.products.filter((item) => categoryIds.has(item.categoryId)).map((item) => ({
    id: item.id, categoryId: item.categoryId, name: item.name, description: item.description,
    priceCents: item.priceCents, image: item.image, video: item.videoUrl,
    allergens: item.allergens, available: item.available,
  }));
  const { capacityPerSlot, ...booking } = settings.booking;
  return { ...demoSite, ...applyContent(settings.content), preview: !settings.live, categories, menu, booking };
}

export const staleRecord = () => new ApiError(409, "I dati sono cambiati. Aggiorna la pagina e riprova.");

export async function saveCategory(db, values, id) {
  const params = [values.name, values.sortOrder, values.archived, id ?? randomUUID()];
  const result = id
    ? await db.query(
      `UPDATE menu_categories SET name = $1, sort_order = $2, archived = $3, revision = revision + 1
       WHERE id = $4 AND revision = $5 RETURNING ${categoryFields}`, [...params, values.revision],
    )
    : await db.query(
      `INSERT INTO menu_categories (name, sort_order, archived, id)
       VALUES ($1, $2, $3, $4) RETURNING ${categoryFields}`, params,
    );
  if (!result.rows.length) throw staleRecord();
  return result.rows[0];
}

function decodePhoto(encoded) {
  const data = Buffer.from(encoded, "base64");
  if (data.length < 12 || data.length > 1_200_000) throw new ApiError(400, "La foto deve essere al massimo 1,2 MB.");
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { data, type: "image/jpeg" };
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { data, type: "image/png" };
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return { data, type: "image/webp" };
  throw new ApiError(400, "Carica una foto JPEG, PNG o WebP.");
}

export async function saveProduct(db, values, id) {
  const photo = values.photoData ? decodePhoto(values.photoData) : null;
  const productId = id ?? randomUUID();
  return db.transaction(async (tx) => {
    const existing = id
      ? (await tx.query("SELECT revision, photo_id, category_id FROM menu_items WHERE id = $1 FOR UPDATE", [id])).rows[0]
      : null;
    if (id && (!existing || existing.revision !== values.revision)) throw staleRecord();
    const category = (await tx.query("SELECT archived FROM menu_categories WHERE id = $1 FOR SHARE", [values.categoryId])).rows[0];
    if (!category || (category.archived && existing?.category_id !== values.categoryId)) {
      throw new ApiError(400, "Scegli una categoria attiva.");
    }

    let photoId = values.removePhoto ? null : existing?.photo_id ?? null;
    if (photo) {
      photoId = randomUUID();
      await tx.query("INSERT INTO menu_photos (id, content_type, data) VALUES ($1, $2, $3)", [photoId, photo.type, photo.data]);
    }

    const params = [values.categoryId, values.name, values.description, values.priceCents,
      values.imageUrl, photoId, values.videoUrl, values.allergens, values.available, values.sortOrder,
      values.archived, productId];
    if (id) {
      await tx.query(
        `UPDATE menu_items SET category_id=$1, name=$2, description=$3, price_cents=$4, image_url=$5,
         photo_id=$6, video_url=$7, allergens=$8, available=$9, sort_order=$10, archived=$11,
         revision=revision+1 WHERE id=$12`, params,
      );
    } else {
      await tx.query(
        `INSERT INTO menu_items (category_id, name, description, price_cents, image_url, photo_id,
         video_url, allergens, available, sort_order, archived, id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, params,
      );
    }
    if (existing?.photo_id && existing.photo_id !== photoId) {
      await tx.query("DELETE FROM menu_photos WHERE id = $1", [existing.photo_id]);
    }
    const { rows: [item] } = await tx.query(`SELECT ${itemFields} FROM menu_items i WHERE i.id = $1`, [productId]);
    return { ...item, image: productImage(item) };
  });
}

export async function getPhoto(db, id) {
  const { rows: [image] } = await db.query(
    "SELECT content_type, data FROM menu_photos WHERE id = $1", [id],
  );
  if (!image) throw new ApiError(404, "Foto non trovata.");
  return image;
}
