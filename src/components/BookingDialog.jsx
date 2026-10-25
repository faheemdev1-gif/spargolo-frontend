import { useEffect, useRef, useState } from "react";
import { apiEnabled, createBooking } from "../lib/api";
import {
  addDays,
  availableSlots,
  bookingPayload,
  customerPayload,
  formatDate,
  parseDate,
  venueNow,
} from "../lib/domain";
import { useSubmissionKey } from "../hooks/useSubmissionKey";
import {
  CloseButton,
  Dialog,
  FormFields,
  PreviewNotice,
  Wordmark,
} from "./Shared";

function Calendar({ rules, value, onChange }) {
  const today = venueNow(new Date(), rules.timeZone).date;
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const first = parseDate(`${month}-01`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const lastMonth = addDays(today, rules.horizonDays).slice(0, 7);
  const move = (delta) => {
    const next = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1),
    );
    setMonth(next.toISOString().slice(0, 7));
  };
  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          aria-label="Mese precedente"
          disabled={month <= today.slice(0, 7)}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <span aria-live="polite">
          {new Intl.DateTimeFormat("it-IT", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(first)}
        </span>
        <button
          type="button"
          aria-label="Mese successivo"
          disabled={month >= lastMonth}
          onClick={() => move(1)}
        >
          →
        </button>
      </div>
      <div className="calendar-week" aria-hidden="true">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="calendar-days" role="group" aria-label="Scegli la data">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const enabled = availableSlots(key, rules).length > 0;
          return (
            <button
              type="button"
              key={key}
              className={`${key === value ? "selected" : ""} ${key === today ? "today" : ""}`}
              disabled={!enabled}
              aria-label={`${formatDate(key)}${enabled ? "" : ", non disponibile"}`}
              aria-pressed={key === value}
              onClick={() => onChange(key)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingTicket({ values, site }) {
  return (
    <div className="review-ticket">
      <span className="ticket-label">
        LA TUA SERATA{site.preview ? " · BOZZA" : ""}
      </span>
      <h3>
        {site.brand.name},<br />
        in buona compagnia.
      </h3>
      {[
        ["Quando", `${formatDate(values.date)}, ${values.time}`],
        [
          "In quanti",
          `${values.guests} ${values.guests === 1 ? "persona" : "persone"}`,
        ],
        ["A nome di", values.name.trim()],
        ["Email", values.email.trim()],
        ...(values.phone.trim() ? [["Telefono", values.phone.trim()]] : []),
        ["Dove", site.contact.address],
      ].map(([label, value]) => (
        <div className="ticket-row" key={label}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
      {values.notes.trim() && (
        <p className="ticket-note">La tua nota: {values.notes.trim()}</p>
      )}
    </div>
  );
}

export default function BookingDialog({ site, lines, onClose }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    guests: 2,
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const titleRef = useRef(null);
  const submissionKey = useSubmissionKey();
  const demo = site.preview || !apiEnabled;
  const slots = availableSlots(values.date, site.booking);
  const update = (next) => {
    setValues(next);
    setError("");
  };
  useEffect(() => {
    titleRef.current?.focus();
  }, [step, result]);

  const submit = async () => {
    setError("");
    try {
      const payload = bookingPayload(values, lines, site.booking);
      if (demo) {
        setResult({ demo: true });
        return;
      }
      setSending(true);
      const response = await createBooking(payload, submissionKey(payload));
      if (
        typeof response.id !== "string" ||
        !["pending", "confirmed"].includes(response.status)
      )
        throw new Error(
          "Non abbiamo ricevuto una conferma dal servizio. Riprova o chiamaci.",
        );
      setResult(response);
    } catch (err) {
      setError(err.message || "Non è stato possibile inviare la richiesta.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      className="booking-dialog"
      titleId="booking-title"
      onClose={sending ? () => {} : onClose}
    >
      <div className="booking-top">
        <Wordmark
          name={site.brand.name}
          onClick={(e) => {
            e.preventDefault();
            if (!sending) onClose();
          }}
        />
        <CloseButton
          onClick={sending ? () => {} : onClose}
          label="Chiudi prenotazione"
        />
      </div>
      <div className="booking-content">
        <p className="eyebrow burgundy">Una bella serata comincia qui.</p>
        <h2 id="booking-title" ref={titleRef} tabIndex={-1}>
          Facciamo <em>un tavolo?</em>
        </h2>
        {!result && (
          <div
            className="booking-progress"
            aria-label={`Prenotazione, passaggio ${step} di 3`}
          >
            {["La serata", "I dettagli", "Il riepilogo"].map((label, i) => (
              <span
                key={label}
                className={step === i + 1 ? "active" : ""}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                0{i + 1} <b>{label}</b>
              </span>
            ))}
          </div>
        )}
        {demo && (
          <PreviewNotice>
            Esperienza dimostrativa. Nessuna prenotazione viene inviata.
          </PreviewNotice>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {result ? (
          <div className="preview-done">
            <span className="big-star" aria-hidden="true">
              ✳
            </span>
            <h3>
              {result.demo ? (
                <>
                  La serata
                  <br />
                  prende forma.
                </>
              ) : result.status === "confirmed" ? (
                "Il tuo tavolo è confermato."
              ) : (
                "Richiesta ricevuta."
              )}
            </h3>
            <p>
              {result.demo
                ? "Hai completato l’anteprima. Nessuna richiesta è stata inviata e nessun tavolo è stato riservato."
                : result.status === "confirmed"
                  ? "Il locale ha confermato la prenotazione."
                  : "Il locale deve ancora confermare il tavolo. Ti contatterà ai recapiti indicati."}
            </p>
            <BookingTicket site={site} values={values} />
            {!result.demo && (
              <p className="data-note">Riferimento: {result.id}</p>
            )}
            <a className="button green" href={`tel:${site.contact.phone}`}>
              {result.demo
                ? "Per prenotare davvero, chiamaci"
                : "Contatta il locale"}
              <span>↗</span>
            </a>
            <button className="text-link done-close" onClick={onClose}>
              Torna alla serata <span>↗</span>
            </button>
          </div>
        ) : step === 1 ? (
          <>
            <span className="booking-label">01 / In quanti siete?</span>
            <div
              className="party-options"
              role="group"
              aria-label="Numero di persone"
            >
              {Array.from({ length: site.booking.maxGuests }, (_, i) => (
                <button
                  key={i}
                  className={values.guests === i + 1 ? "selected" : ""}
                  aria-pressed={values.guests === i + 1}
                  onClick={() => update({ ...values, guests: i + 1 })}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="group-note">
              Più di {site.booking.maxGuests}? Organizziamoci insieme:{" "}
              <a href={`tel:${site.contact.phone}`}>chiamaci ↗</a>
            </p>
            <span className="booking-label">02 / Quale serata?</span>
            <Calendar
              rules={site.booking}
              value={values.date}
              onChange={(date) =>
                update({
                  ...values,
                  date,
                  time: availableSlots(date, site.booking).includes(values.time)
                    ? values.time
                    : "",
                })
              }
            />
            <p className="time-note">
              {demo
                ? "Calendario dimostrativo. Le regole saranno confermate dal locale."
                : "Le richieste sono soggette a conferma del locale."}
            </p>
            <span className="booking-label">03 / A che ora?</span>
            <div
              className="time-options"
              role="group"
              aria-label="Orario desiderato"
            >
              {site.booking.slots.map((slot) => (
                <button
                  key={slot}
                  disabled={!slots.includes(slot)}
                  className={values.time === slot ? "selected" : ""}
                  aria-pressed={values.time === slot}
                  onClick={() => update({ ...values, time: slot })}
                >
                  {slot}
                </button>
              ))}
            </div>
            <p className="time-note">
              {!values.date
                ? "Scegli una data per esplorare gli orari."
                : demo
                  ? "Fasce illustrative, non disponibilità in tempo reale."
                  : "Scegli l’orario che preferisci. Il tavolo sarà confermato dal locale."}
            </p>
            {lines.length > 0 && (
              <p className="selection-note">
                Portiamo con te anche le tue{" "}
                {lines.reduce((n, line) => n + line.quantity, 0)} scelte dal
                menu.
              </p>
            )}
            <div className="booking-nav">
              <span className="time-note">Il tuo tavolo ti somiglia già.</span>
              <button
                className="button green"
                disabled={!values.date || !slots.includes(values.time)}
                onClick={() => setStep(2)}
              >
                I tuoi dettagli <span>→</span>
              </button>
            </div>
          </>
        ) : step === 2 ? (
          <>
            <div className="booking-summary-strip">
              <span>{formatDate(values.date)}</span>
              <span>{values.time}</span>
              <span>{values.guests} persone</span>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  customerPayload(values);
                  setError("");
                  setStep(3);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <FormFields values={values} onChange={update} prefix="booking" />
              <p className="data-note">
                {demo
                  ? "I dati restano nella memoria di questa pagina e non vengono inviati."
                  : "Useremo questi recapiti per gestire la richiesta. Non inserire informazioni sensibili nelle note."}{" "}
                Per esigenze alimentari, contatta direttamente il locale.
              </p>
              <div className="booking-nav">
                <button type="button" onClick={() => setStep(1)}>
                  ← La serata
                </button>
                <button className="button green" type="submit">
                  Rivedi la tua serata <span>→</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <BookingTicket values={values} site={site} />
            {lines.length > 0 && (
              <p className="selection-note">
                Le tue preferenze:{" "}
                {lines
                  .map((line) => `${line.quantity} × ${line.name}`)
                  .join(" · ")}
              </p>
            )}
            <div className="draft-reminder">
              {demo
                ? "Questa è un’anteprima: puoi completarla senza inviare una richiesta o riservare un tavolo."
                : "Invieremo la richiesta al locale. Il tavolo non è confermato finché il locale non la accetta."}
            </div>
            <div className="booking-nav">
              <button disabled={sending} onClick={() => setStep(2)}>
                ← I dettagli
              </button>
              <button
                className="button green"
                disabled={sending}
                onClick={submit}
              >
                {sending
                  ? "Invio in corso…"
                  : demo
                    ? "Completa l’anteprima"
                    : "Invia la richiesta"}
                <span>↗</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
