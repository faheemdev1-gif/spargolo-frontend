import { randomBytes } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { digest, hashPassword, verifyPassword } from "./passwords.js";
import { ApiError } from "./validation.js";

const maxAge = 12 * 60 * 60;

function cookieOptions(c, secure) {
  const useSecure = secure || new URL(c.req.url).protocol === "https:";
  return {
    name: useSecure ? "__Host-spargolo" : "spargolo_session",
    options: { httpOnly: true, path: "/", sameSite: "Strict", secure: useSecure, maxAge },
  };
}

export async function rateLimit(db, scope, address, max, durationSeconds) {
  const key = digest(`${scope}:${address}`);
  const { rows: [{ hits }] } = await db.query(
    `INSERT INTO rate_limits (id, hits, expires_at) VALUES($1, 1, now() + $2 * interval '1 second')
     ON CONFLICT (id) DO UPDATE SET
      hits = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE LEAST(rate_limits.hits + 1, $3 + 1) END,
      expires_at = CASE WHEN rate_limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END
     RETURNING hits`,
    [key, durationSeconds, max],
  );
  if (hits > max) throw new ApiError(429, "Troppi tentativi. Riprova più tardi.");
  if (hits === 1) await db.query("DELETE FROM rate_limits WHERE expires_at <= now()");
}

export async function signIn(c, db, credentials, secure) {
  const { rows: [user] } = await db.query(
    "SELECT password_hash FROM admin_users WHERE email = $1", [credentials.email],
  );
  if (!await verifyPassword(credentials.password, user?.password_hash)) {
    throw new ApiError(401, "Email o password non corretti.");
  }
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    const current = (await tx.query("SELECT password_hash FROM admin_users WHERE email = $1 FOR SHARE", [credentials.email])).rows[0];
    if (current?.password_hash !== user.password_hash) throw new ApiError(401, "Accedi di nuovo.");
    await tx.query("DELETE FROM admin_sessions WHERE expires_at <= now()");
    await tx.query(
      "INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES ($1, $2, now() + $3 * interval '1 second')",
      [digest(token), credentials.email, maxAge],
    );
  });
  const { name, options } = cookieOptions(c, secure);
  setCookie(c, name, token, options);
  return { email: credentials.email };
}

export async function getSession(c, db, secure) {
  const { name } = cookieOptions(c, secure);
  const token = getCookie(c, name);
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new ApiError(401, "Accedi per continuare.");
  const tokenHash = digest(token);
  const { rows: [user] } = await db.query(
    "SELECT email FROM admin_sessions WHERE token_hash = $1 AND expires_at > now()", [tokenHash],
  );
  if (!user) throw new ApiError(401, "Accedi per continuare.");
  return { ...user, tokenHash };
}

function clearCookie(c, secure) {
  const { name, options } = cookieOptions(c, secure);
  deleteCookie(c, name, options);
}

export async function signOut(c, db, secure) {
  const { name } = cookieOptions(c, secure);
  const token = getCookie(c, name);
  if (token && /^[a-zA-Z0-9_-]{43}$/.test(token)) {
    await db.query("DELETE FROM admin_sessions WHERE token_hash = $1", [digest(token)]);
  }
  clearCookie(c, secure);
}

export async function changePassword(c, db, session, input, secure) {
  const { rows: [user] } = await db.query("SELECT password_hash FROM admin_users WHERE email = $1", [session.email]);
  if (!await verifyPassword(input.currentPassword, user?.password_hash)) {
    throw new ApiError(400, "Password attuale non corretta.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    const { rows } = await tx.query(
      "UPDATE admin_users SET password_hash = $1 WHERE email = $2 AND password_hash = $3 RETURNING email",
      [passwordHash, session.email, user.password_hash],
    );
    if (!rows.length) throw new ApiError(409, "La password è cambiata. Accedi di nuovo.");
    await tx.query("DELETE FROM admin_sessions WHERE email = $1", [session.email]);
  });
  clearCookie(c, secure);
}
