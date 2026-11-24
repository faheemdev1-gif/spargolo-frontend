import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const hashPattern = /^scrypt-v1:[a-f\d]{32}:[a-f\d]{64}$/;
export const isPasswordHash = (value) => typeof value === "string" && hashPattern.test(value);
export const digest = (value) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, 32, parameters);
  return `scrypt-v1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const validFormat = isPasswordHash(stored);
  const [, salt, key] = validFormat ? stored.split(":") : ["", "0".repeat(32), "0".repeat(64)];
  const derived = await derive(password, Buffer.from(salt, "hex"), 32, parameters);
  return timingSafeEqual(derived, Buffer.from(key, "hex")) && validFormat;
}
