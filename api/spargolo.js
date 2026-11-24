import { createApp } from "../server/app.js";
import { initializeDatabase, postgresDatabase } from "../server/db.js";

let ready;

function database() {
  if (!process.env.DATABASE_URL) return null;
  if (!ready) {
    const db = postgresDatabase(process.env.DATABASE_URL);
    ready = initializeDatabase(db, process.env).then(() => db).catch(async (error) => {
      ready = undefined;
      await db.close().catch(() => {});
      throw error;
    });
  }
  return ready;
}

const app = createApp(database, {
  secureCookies: true,
  clientIp: (c) => c.req.header("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown",
});

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/spargolo" || url.pathname === "/api/spargolo.js") {
      const route = url.searchParams.get("__route");
      if (!route || !/^[a-zA-Z0-9_/\-]+$/.test(route)) return new Response(null, { status: 404 });
      url.pathname = `/api/v1/${route}`;
      url.searchParams.delete("__route");
      return app.fetch(new Request(url, request));
    }
    return app.fetch(request);
  },
};
