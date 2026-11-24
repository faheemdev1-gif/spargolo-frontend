import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { initializeDatabase, postgresDatabase } from "./db.js";

export async function openDatabase(env = process.env) {
  const db = env.DATABASE_URL ? postgresDatabase(env.DATABASE_URL) : await embeddedDatabase(env.SPARGOLO_LOCAL_DB || ".data/spargolo");
  try {
    await initializeDatabase(db, env);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function embeddedDatabase(path) {
  if (path) await mkdir(dirname(path), { recursive: true });
  const instance = await PGlite.create(path);
  return instance;
}
