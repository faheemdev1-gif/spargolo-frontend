import { useState } from "react";
import { apiEnabled, createOrder } from "../lib/api";
import { cartTotal, money, orderPayload } from "../lib/domain";
import { useSubmissionKey } from "../hooks/useSubmissionKey";
import {
  CloseButton,
  Dialog,
  FormFields,
  PreviewNotice,
  Wordmark,
} from "./Shared";

export default function OrderDialog({
  site,
  lines,
  onQuantity,
  onClose,
  onBook,
}) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const submissionKey = useSubmissionKey();
  const demo = site.preview || !apiEnabled;
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = orderPayload(values, lines);
      if (demo) {
        setResult({ demo: true });
        return;
      }
      setSending(true);
      const response = await createOrder(payload, submissionKey(payload));
      if (typeof response.id !== "string" || response.status !== "pending")
        throw new Error(
          "Non abbiamo ricevuto un riferimento dal servizio. Riprova o chiamaci.",
        );
      setResult(response);
    } catch (err) {
      setError(err.message || "Non è stato possibile inviare la selezione.");
    } finally {
      setSending(false);
    }
  };
  return (
    <Dialog
      className="booking-dialog order-dialog"
      titleId="order-title"
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
          label="Chiudi selezione"
        />
      </div>
      <div className="booking-content">
        <p className="eyebrow burgundy">Da immaginare, da condividere.</p>
        <h2 id="order-title">
          Il tuo <em>piccolo giro.</em>
        </h2>
        {demo && (
          <PreviewNotice>
            Una selezione dimostrativa. Nessun ordine viene inviato.
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
            <h3>{result.demo ? "Che bel giro." : "Selezione ricevuta."}</h3>
            <p>
              {result.demo
                ? "La tua selezione è pronta nell’anteprima. Nulla è stato inviato, ordinato o pagato."
                : "Il locale deve confermare la disponibilità e concordare il servizio. Non è ancora un ordine confermato e non è stato effettuato alcun pagamento."}
            </p>
            {!result.demo && <p>Riferimento: {result.id}</p>}
            <button className="button green" onClick={onBook}>
              Ora scegli il tavolo <span>↗</span>
            </button>
            <button className="text-link done-close" onClick={onClose}>
              Torna al menu <span>↗</span>
            </button>
          </div>
        ) : (
          <>
            <div className="order-items">
              {lines.map((item) => (
                <article className="order-line" key={item.id}>
                  <img src={item.image} alt="" />
                  <div>
                    <h3>{item.name}</h3>
                    <span>{money(item.priceCents)}</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => onQuantity(item.id, -1)}
                        disabled={sending}
                        aria-label={`Rimuovi una porzione di ${item.name}`}
                      >
                        −
                      </button>
                      <span aria-label="Quantità">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQuantity(item.id, 1)}
                        disabled={sending || item.quantity >= 20}
                        aria-label={`Aggiungi una porzione di ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <strong>{money(item.priceCents * item.quantity)}</strong>
                </article>
              ))}
            </div>
            {!lines.length && (
              <p className="empty-selection">
                Il tuo giro è ancora da immaginare. Torna al menu e scegli
                qualcosa di buono.
              </p>
            )}
            <div className="order-total">
              <span>Totale {demo ? "illustrativo" : "indicativo"}</span>
              <strong>{money(cartTotal(lines))}</strong>
            </div>
            {step === 1 ? (
              <div className="order-actions">
                <button
                  className="button green"
                  onClick={() => setStep(2)}
                  disabled={!lines.length}
                >
                  Rivedi i dettagli <span>→</span>
                </button>
                <button className="text-link" onClick={onBook}>
                  Preferisci un tavolo? <span>↗</span>
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <FormFields
                  values={values}
                  onChange={setValues}
                  prefix="order"
                  disabled={sending}
                />
                <p className="data-note">
                  {demo
                    ? "I dati restano solo in questa pagina."
                    : "Invieremo la selezione al locale perché possa contattarti."}{" "}
                  È una richiesta dal menu: servizio e disponibilità vanno
                  concordati. Nessun pagamento online.
                </p>
                <div className="booking-nav">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setStep(1)}
                  >
                    ← La selezione
                  </button>
                  <button
                    className="button green"
                    disabled={sending || !lines.length}
                  >
                    {sending
                      ? "Invio in corso…"
                      : demo
                        ? "Completa l’anteprima"
                        : "Invia la selezione"}
                    <span>↗</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
