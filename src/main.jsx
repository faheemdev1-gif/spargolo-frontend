import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App, { PageBoundary } from "./App";
import "./styles/site.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PageBoundary>
      <App />
    </PageBoundary>
  </StrictMode>,
);
