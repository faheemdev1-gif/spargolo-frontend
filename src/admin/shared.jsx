import { useEffect, useState } from "react";
import { Dialog } from "../components/Shared.jsx";
import { adminApi } from "./api.js";

export function useLoad(path) {
  const [result, setResult] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    adminApi(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ path, data, error: "" });
    }).catch((problem) => {
      if (!controller.signal.aborted) setResult({ path, data: null, error: problem.message });
    });
    return () => controller.abort();
  }, [path, refreshCount]);

  return {
    data: result?.path === path ? result.data : null,
    error: result?.path === path ? result.error : "",
    refresh() {
      if (result?.error) setResult(null);
      setRefreshCount((count) => count + 1);
    },
  };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function StatusText({ children, error = false }) {
  return children ? <p className={error ? "admin-alert" : "admin-status"} role={error ? "alert" : "status"}>{children}</p> : null;
}

export function Field({ label, detail, children, wide = false }) {
  return (
    <label className={wide ? "admin-field admin-wide" : "admin-field"}>
      <span>{label}</span>
      {children}
      {detail && <small>{detail}</small>}
    </label>
  );
}

export function Check({ label, ...props }) {
  return <label className="admin-check"><input type="checkbox" {...props} /> {label}</label>;
}

export function Editor({ title, close, children }) {
  return (
    <Dialog className="admin-dialog" titleId="admin-dialog-title" onClose={close}>
      <div className="admin-dialog-head">
        <h2 id="admin-dialog-title">{title}</h2>
        <button type="button" onClick={close} aria-label="Chiudi" className="admin-close">×</button>
      </div>
      {children}
    </Dialog>
  );
}

export function SaveBar({ busy, close, label = "Salva modifiche" }) {
  return (
    <div className="admin-actions">
      {close && <button type="button" onClick={close} disabled={busy}>Annulla</button>}
      <button className="admin-primary" type="submit" disabled={busy}>{busy ? "Salvataggio…" : label}</button>
    </div>
  );
}

export function LoadStatus({ load }) {
  if (load.error) return <><StatusText error>{load.error}</StatusText><button type="button" onClick={load.refresh}>Riprova</button></>;
  if (!load.data) return <StatusText>Caricamento…</StatusText>;
  return null;
}
