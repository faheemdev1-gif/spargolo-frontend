import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function localApi(env) {
  let db;
  const mount = async (server) => {
    const [{ getRequestListener }, { createApp }, { openDatabase }] = await Promise.all([
      import("@hono/node-server"),
      import("./server/app.js"),
      import("./server/local.js"),
    ]);
    const app = createApp(() => db ||= openDatabase(env).catch((error) => {
      db = undefined;
      throw error;
    }));
    const listener = getRequestListener(app.fetch);
    server.middlewares.use((req, res, next) => {
      if (req.url === "/api/v1" || req.url?.startsWith("/api/v1/")) return listener(req, res);
      next();
    });
    server.httpServer?.once("close", () => {
      if (db) void db.then((connection) => connection.close()).catch(() => {});
    });
  };
  return { name: "spargolo-local-api", apply: "serve", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localApi({ ...loadEnv(mode, process.cwd(), ""), ...process.env })],
  build: { outDir: "dist" },
}));
