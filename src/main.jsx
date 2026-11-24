import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App, { PageBoundary } from "./App";
import "./styles/site.css";

const Admin = lazy(() => import("./admin/Admin.jsx"));
const admin = /^\/admin(?:\/|$)/.test(window.location.pathname);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PageBoundary>
      {admin ? (
        <Suspense fallback={<main className="site-unavailable">Caricamento…</main>}>
          <Admin />
        </Suspense>
      ) : <App />}
    </PageBoundary>
  </StrictMode>,
);
