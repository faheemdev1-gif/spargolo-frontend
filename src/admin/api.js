export async function adminApi(path, { method = "GET", body, key, signal } = {}) {
  const response = await fetch(`/api/v1/admin${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    if (response.status === 401 && path !== "/login" && path !== "/session") {
      window.dispatchEvent(new Event("spargolo-session-ended"));
    }
    throw Object.assign(new Error(data?.message || "Impossibile collegarsi alla gestione."), { status: response.status });
  }
  return data;
}

export const euroInput = (cents) => (cents / 100).toFixed(2).replace(".", ",");

export function readEuros(value) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error("Inserisci un prezzo in euro, ad esempio 6,50.");
  const [whole, fraction = ""] = value.trim().split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export async function preparePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 18_000_000) {
    throw new Error("Scegli una foto JPEG, PNG o WebP di massimo 18 MB.");
  }
  const image = await createImageBitmap(file).catch(() => { throw new Error("Non riesco ad aprire questa foto."); });
  const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const photo = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
  if (!photo || photo.size > 1_200_000) throw new Error("La foto è troppo grande. Scegli una versione più piccola.");
  const encoded = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(photo);
  });
  return encoded.split(",")[1];
}
