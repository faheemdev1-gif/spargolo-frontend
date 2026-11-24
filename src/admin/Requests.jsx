import { useState } from "react";
import { formatDate, money } from "../lib/domain.js";
import { statusLabels, statusTransitions } from "../lib/requestStatuses.js";
import { adminApi } from "./api.js";
import { Editor, Field, LoadStatus, SaveBar, StatusText, useAction, useLoad } from "./shared.jsx";

const stamp = (value) => new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(value));
const blankCustomer = { name: "", email: "", phone: "" };

function CustomerFields({ customer, onChange }) {
  const field = (key) => ({ value: customer[key], onChange: (e) => onChange({ ...customer, [key]: e.target.value }) });
  return (
    <>
      <Field label="Nome e cognome"><input required maxLength={90} {...field("name")} /></Field>
      <Field label="Email"><input type="email" required maxLength={150} {...field("email")} /></Field>
      <Field label="Telefono"><input type="tel" maxLength={35} {...field("phone")} /></Field>
    </>
  );
}

function BookingFields({ values, update, slots, maxGuests }) {
  const field = (key) => ({ value: values[key] || "", onChange: (e) => update(key, e.target.value) });
  const allSlots = slots.includes(values.time) || !values.time ? slots : [...slots, values.time].sort();
  return (
    <>
      <Field label="Data"><input type="date" required {...field("date")} /></Field>
      <Field label="Orario">
        <select required {...field("time")}>
          <option value="">Scegli un orario</option>
          {allSlots.map((slot) => <option key={slot}>{slot}</option>)}
        </select>
      </Field>
      <Field label="Persone"><input type="number" required min="1" max={Math.max(maxGuests, Number(values.guestCount) || 0)} {...field("guestCount")} /></Field>
    </>
  );
}

function RequestForm({ resource, record, rules, catalog, close, saved }) {
  const booking = resource === "bookings";
  const [values, set] = useState(record || { customer: blankCustomer, notes: "", date: "", time: "", guestCount: 2 });
  const [quantities, setQuantities] = useState({});
  const [submission, setSubmission] = useState(null);
  const action = useAction();
  const update = (key, value) => set((previous) => ({ ...previous, [key]: value }));
  const activeCategories = new Set(catalog?.categories.filter((category) => !category.archived).map((category) => category.id));
  const products = catalog?.products.filter((item) => item.available && !item.archived && activeCategories.has(item.categoryId)) ?? [];
  const total = products.reduce((sum, product) => sum + product.priceCents * (quantities[product.id] || 0), 0);

  const submit = (event) => {
    event.preventDefault();
    return action.run(async () => {
      const body = { customer: values.customer, notes: values.notes };
      if (booking) Object.assign(body, {
        date: values.date, time: values.time, guestCount: Number(values.guestCount), timeZone: "Europe/Rome",
      });
      if (record) {
        Object.assign(body, { revision: values.revision, status: values.status });
        await adminApi(`/${resource}/${record.id}`, { method: "PATCH", body });
      } else {
        if (!booking) {
          body.type = "menu_inquiry";
          body.items = products.filter((product) => quantities[product.id] > 0)
            .map((product) => ({ menuItemId: product.id, quantity: quantities[product.id] }));
          if (!body.items.length) throw new Error("Scegli almeno un prodotto.");
        }
        const serialized = JSON.stringify(body);
        const key = submission?.serialized === serialized ? submission.key : crypto.randomUUID();
        setSubmission({ serialized, key });
        await adminApi(`/${resource}`, { method: "POST", body, key });
      }
      saved();
    });
  };

  const otherStatuses = record ? statusTransitions[record.status] : [];
  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-fields">
        <CustomerFields customer={values.customer} onChange={(value) => update("customer", value)} />
        {booking && <BookingFields values={values} update={update} slots={rules.slots} maxGuests={rules.maxGuests} />}
        {record && <Field label="Stato">
          <select value={values.status} onChange={(e) => update("status", e.target.value)}>
            {[record.status, ...otherStatuses].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </Field>}
        <Field label="Note" wide><textarea maxLength={700} rows="3" value={values.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div>
      {record && <div className="admin-contact-links">
        <a href={`mailto:${encodeURIComponent(record.customer.email)}`}>Scrivi al cliente</a>
        {record.customer.phone?.replace(/[^+\d]/g, "") && <a href={`tel:${record.customer.phone.replace(/[^+\d]/g, "")}`}>Chiama</a>}
      </div>}
      {!booking && !record && <fieldset className="admin-line-picker">
        <legend>Prodotti</legend>
        {products.map((product) => <Field key={product.id} label={`${product.name} · ${money(product.priceCents)}`}>
          <input type="number" min="0" max="20" value={quantities[product.id] || ""} placeholder="0"
            onChange={(e) => setQuantities({ ...quantities, [product.id]: Number(e.target.value) })} />
        </Field>)}
        {!products.length && <p className="admin-muted">Aggiungi prodotti disponibili al menu.</p>}
        <p>Totale indicativo <strong>{money(total)}</strong></p>
      </fieldset>}
      {record?.items.length > 0 && <section className="admin-record-lines">
        <h3>{booking ? "Preferenze del menu" : "Prodotti richiesti"}</h3>
        <ul>{record.items.map((item) => <li key={item.menuItemId}>
          <span>{item.quantity} × {item.name}</span><span>{money(item.priceCents * item.quantity)}</span>
        </li>)}</ul>
        {!booking && <p>Totale registrato <strong>{money(record.totalCents)}</strong></p>}
      </section>}
      {record?.history.length > 0 && <details className="admin-history">
        <summary>Cronologia</summary>
        <ul>{record.history.map((event) => <li key={event.id}>
          <span>{event.action === "created" ? "Ricevuta" : event.action === "rescheduled" ? "Data, ora o coperti aggiornati" : "Modificata"} · {statusLabels[event.details.status]}</span>
          <small>{stamp(event.createdAt)} · {event.actor || "Sito pubblico"}</small>
        </li>)}</ul>
      </details>}
      <StatusText error>{action.error}</StatusText>
      <SaveBar busy={action.busy} close={close} label={record ? "Salva modifiche" : "Registra richiesta"} />
    </form>
  );
}

function BookingForm({ resource, record, close, saved }) {
  const load = useLoad("/settings");
  return load.data ? <RequestForm resource={resource} record={record} rules={load.data.booking} close={close} saved={saved} /> : <LoadStatus load={load} />;
}

function NewOrderForm({ resource, close, saved }) {
  const load = useLoad("/catalog");
  return load.data ? <RequestForm resource={resource} catalog={load.data} close={close} saved={saved} /> : <LoadStatus load={load} />;
}

function RequestDetails({ resource, id, close, saved }) {
  const load = useLoad(`/${resource}/${id}`);
  if (!load.data) return <LoadStatus load={load} />;
  if (resource === "bookings") return <BookingForm resource={resource} record={load.data} close={close} saved={saved} />;
  return <RequestForm resource={resource} record={load.data} close={close} saved={saved} />;
}

export default function Requests({ resource }) {
  const booking = resource === "bookings";
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const [notice, setNotice] = useState("");
  const params = new URLSearchParams({ page });
  if (status) params.set("status", status);
  if (date) params.set("date", date);
  const load = useLoad(`/${resource}?${params}`);
  const close = () => setView(null);
  const saved = () => {
    close();
    setNotice("Richiesta salvata.");
    load.refresh();
  };

  return (
    <section className="admin-card admin-inbox">
      <div className="admin-card-head">
        <h2>{booking ? "Prenotazioni" : "Richieste dal menu"}</h2>
        <button className="admin-primary" type="button" onClick={() => setView("new")}>{booking ? "Nuova prenotazione" : "Nuova richiesta"}</button>
      </div>
      <div className="admin-filters">
        <Field label="Stato">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tutti gli stati</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {booking && <Field label="Data della prenotazione"><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} /></Field>}
        <button type="button" onClick={load.refresh}>Aggiorna</button>
      </div>
      <StatusText>{notice}</StatusText>
      <LoadStatus load={load} />
      {load.data && <ul className="admin-request-list">
        {load.data.records.map((record) => (
          <li key={record.id}>
            <div><strong>{record.customer.name}</strong><small>{booking ? `${formatDate(record.date)} · ${record.time} · ${record.guestCount} persone` : stamp(record.createdAt)}</small></div>
            <span className={`admin-badge admin-badge--${record.status}`}>{statusLabels[record.status]}</span>
            {!booking && <strong>{money(record.totalCents)}</strong>}
            <button type="button" onClick={() => setView(record.id)} aria-label={`Apri la richiesta di ${record.customer.name}`}>Apri</button>
          </li>
        ))}
      </ul>}
      {load.data?.records.length === 0 && <p className="admin-muted">Nessuna richiesta corrispondente.</p>}
      {(page > 1 || load.data?.hasMore) && <div className="admin-pagination">
        <button type="button" disabled={page < 2} onClick={() => setPage(page - 1)}>Precedente</button>
        <span>Pagina {page}</span>
        <button type="button" disabled={!load.data?.hasMore} onClick={() => setPage(page + 1)}>Successiva</button>
      </div>}
      {view && <Editor title={view === "new" ? (booking ? "Nuova prenotazione" : "Nuova richiesta") : "Dettaglio richiesta"} close={close}>
        {view === "new" ? (
          booking ? <BookingForm resource={resource} close={close} saved={saved} /> : <NewOrderForm resource={resource} close={close} saved={saved} />
        ) : <RequestDetails resource={resource} id={view} close={close} saved={saved} />}
      </Editor>}
    </section>
  );
}
