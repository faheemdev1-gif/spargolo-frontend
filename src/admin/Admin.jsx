import { useEffect, useState } from "react";
import { adminApi } from "./api.js";
import Catalog from "./Catalog.jsx";
import Requests from "./Requests.jsx";
import Settings from "./Settings.jsx";
import { Field, SaveBar, StatusText, useAction } from "./shared.jsx";
import "./admin.css";

const sections = [
  ["catalog", "Menu"],
  ["bookings", "Prenotazioni"],
  ["orders", "Richieste"],
  ["settings", "Impostazioni"],
  ["account", "Account"],
];

function Login({ onLogin, message, problem }) {
  const action = useAction();
  const submit = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    return action.run(async () => onLogin(await adminApi("/login", { method: "POST", body: fields })));
  };
  return (
    <main className="admin-login">
      <div className="admin-login-panel">
        <a href="/" className="admin-home-link"><span translate="no">Spargolo</span></a>
        <h1>Gestione del locale</h1>
        <form className="admin-form" onSubmit={submit}>
          <Field label="Email"><input name="email" required type="email" autoComplete="username" /></Field>
          <Field label="Password"><input name="password" required type="password" autoComplete="current-password" /></Field>
          <StatusText>{message}</StatusText>
          <StatusText error>{action.error || problem}</StatusText>
          <SaveBar busy={action.busy} label="Accedi" />
        </form>
      </div>
    </main>
  );
}

function Account({ email, onChanged }) {
  const action = useAction();
  const submit = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    return action.run(async () => {
      if (fields.newPassword !== fields.confirmPassword) throw new Error("Le nuove password non coincidono.");
      await adminApi("/password", { method: "POST", body: { currentPassword: fields.currentPassword, newPassword: fields.newPassword } });
      onChanged();
    });
  };
  return (
    <section className="admin-card admin-account">
      <div className="admin-card-head"><h2>Cambia password</h2></div>
      <p className="admin-muted">{email}</p>
      <form className="admin-form" onSubmit={submit}>
        <Field label="Password attuale"><input name="currentPassword" required type="password" autoComplete="current-password" /></Field>
        <Field label="Nuova password" detail="Almeno 14 caratteri."><input name="newPassword" required minLength={14} maxLength={128} type="password" autoComplete="new-password" /></Field>
        <Field label="Ripeti la nuova password"><input name="confirmPassword" required type="password" autoComplete="new-password" /></Field>
        <StatusText error>{action.error}</StatusText>
        <SaveBar busy={action.busy} />
      </form>
    </section>
  );
}

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [section, setSection] = useState("catalog");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const action = useAction();

  useEffect(() => {
    document.title = "Spargolo — Gestione del locale";
    const controller = new AbortController();
    adminApi("/session", { signal: controller.signal }).then(setSession).catch((error) => {
      if (controller.signal.aborted) return;
      if (error.status !== 401) setProblem(error.message);
      setSession(null);
    });
    const expired = () => {
      setMessage("La sessione è scaduta. Accedi di nuovo.");
      setSession(null);
    };
    window.addEventListener("spargolo-session-ended", expired);
    return () => {
      controller.abort();
      window.removeEventListener("spargolo-session-ended", expired);
    };
  }, []);

  if (session === undefined) return <main className="admin-login"><p role="status">Caricamento…</p></main>;
  if (!session) return <Login message={message} problem={problem} onLogin={(user) => {
    setMessage("");
    setProblem("");
    setSession(user);
  }} />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="admin-brand" aria-label="Spargolo, gestione" translate="no">spargolo<span>✻</span></a>
        <nav aria-label="Gestione del locale">
          {sections.map(([key, label]) => (
            <button type="button" key={key} aria-current={key === section ? "page" : undefined} onClick={() => setSection(key)}>{label}</button>
          ))}
        </nav>
        <div className="admin-sidebar-end">
          <a href="/">Visita il sito</a>
          <button type="button" onClick={() => action.run(async () => {
            await adminApi("/logout", { method: "POST" });
            setSession(null);
          })} disabled={action.busy}>Esci</button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <h1>{sections.find(([key]) => key === section)[1]}</h1>
          <span>{session.email}</span>
        </div>
        <StatusText error>{action.error}</StatusText>
        {section === "catalog" && <Catalog />}
        {(section === "bookings" || section === "orders") && <Requests key={section} resource={section} />}
        {section === "settings" && <Settings />}
        {section === "account" && <Account email={session.email} onChanged={() => {
          setMessage("Password aggiornata. Accedi con la nuova password.");
          setSession(null);
        }} />}
      </main>
    </div>
  );
}
