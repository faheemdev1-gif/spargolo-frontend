import { randomBytes } from "node:crypto";
import { hashPassword } from "../server/passwords.js";
import { email as emailSchema } from "../server/validation.js";

const [mode, enteredEmail] = process.argv.slice(2);
const result = emailSchema.safeParse(enteredEmail);
if (!result.success) {
  console.error("Provide a valid email address after --.");
  process.exit(1);
}

const email = result.data;
const password = randomBytes(21).toString("base64url");
const passwordHash = await hashPassword(password);

if (mode === "credentials") {
  console.log(`SPARGOLO_ADMIN_EMAIL=${email}\nSPARGOLO_ADMIN_PASSWORD_HASH=${passwordHash}\nPassword to sign in: ${password}`);
} else {
  const { openDatabase } = await import("../server/local.js");
  const db = await openDatabase();
  try {
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO admin_users (email,password_hash) VALUES ($1,$2) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash",
        [email, passwordHash],
      );
      await tx.query("DELETE FROM admin_sessions WHERE email = $1", [email]);
    });
    console.log(`Admin email: ${email}\nPassword to sign in: ${password}`);
  } finally {
    await db.close();
  }
}
