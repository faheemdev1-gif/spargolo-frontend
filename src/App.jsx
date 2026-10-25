import { Component, useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import MenuSection, { FullMenuDialog } from "./components/MenuSection";
import WineDiscovery from "./components/WineDiscovery";
import BookingDialog from "./components/BookingDialog";
import OrderDialog from "./components/OrderDialog";
import Footer from "./components/Footer";
import ReviewsSection from "./components/ReviewsSection";
import { Story, Family, Visit, Ribbon } from "./components/StorySections";
import { CloseButton, Dialog } from "./components/Shared";
import { demoSite } from "./data/site";
import { apiEnabled, loadPublicContent } from "./lib/api";
import { cartLines, changeQuantity } from "./lib/domain";

function Unavailable({ message }) {
  return (
    <main className="site-unavailable">
      <span className="eyebrow burgundy">Spargolo · Milano</span>
      <h1>
        Torniamo <em>tra poco.</em>
      </h1>
      <p role="alert">{message}</p>
      <div className="opening-actions">
        <button
          className="button green"
          onClick={() => window.location.reload()}
        >
          Riprova <span>↗</span>
        </button>
        <a href={`tel:${demoSite.contact.phone}`} className="text-link">
          Chiamaci <span>↗</span>
        </a>
      </div>
    </main>
  );
}

export class PageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Unavailable message="Non riusciamo a mostrare la pagina in questo momento. Riprova oppure contatta il locale." />
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  const [site, setSite] = useState(apiEnabled ? null : demoSite);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null);
  const [cart, setCart] = useState({});
  const [toast, setToast] = useState(null);
  const lines = useMemo(
    () => (site ? cartLines(cart, site.menu) : []),
    [cart, site],
  );

  useEffect(() => {
    document.documentElement.classList.add("js-motion");
    return () => document.documentElement.classList.remove("js-motion");
  }, []);
  useEffect(() => {
    if (!apiEnabled) return undefined;
    const controller = new AbortController();
    loadPublicContent(controller.signal)
      .then(setSite)
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (site) document.title = site.brand.title;
  }, [site]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);
  const quantity = (id, delta) => {
    setCart((current) => changeQuantity(current, id, delta, site.menu));
    if (delta > 0)
      setToast({
        text: `${site.menu.find((item) => item.id === id)?.name} aggiunto al tuo giro`,
        id: Date.now(),
      });
  };

  if (loadError) return <Unavailable message={loadError} />;
  if (!site)
    return (
      <main className="site-unavailable" aria-busy="true">
        <span className="wordmark">spargolo✳</span>
        <p>Un momento, prepariamo il tuo posto…</p>
      </main>
    );

  return (
    <>
      <a className="skip" href="#main">
        Vai al contenuto
      </a>
      <Header site={site} onBook={() => setModal("booking")} />
      <main id="main">
        <Hero site={site} onBook={() => setModal("booking")} />
        <Ribbon />
        <Story site={site} />
        <MenuSection
          site={site}
          cart={cart}
          lines={lines}
          onQuantity={quantity}
          onBook={() => setModal("booking")}
          onOrder={() => setModal("order")}
          onClear={() => setCart({})}
          onFullMenu={() => setModal("menu")}
        />
        <WineDiscovery site={site} />
        <Family site={site} />
        <ReviewsSection
          reviews={site.reviews}
          onBook={() => setModal("booking")}
        />
        <Visit site={site} onBook={() => setModal("booking")} />
      </main>
      <Footer
        site={site}
        onBook={() => setModal("booking")}
        onInfo={() => setModal("info")}
      />
      {modal === "booking" && (
        <BookingDialog
          site={site}
          lines={lines}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "order" && (
        <OrderDialog
          site={site}
          lines={lines}
          onQuantity={quantity}
          onClose={() => setModal(null)}
          onBook={() => setModal("booking")}
        />
      )}
      {modal === "menu" && (
        <FullMenuDialog
          site={site}
          onClose={() => setModal(null)}
          onBook={() => setModal("booking")}
        />
      )}
      {modal === "info" && (
        <Dialog
          className="info-dialog"
          titleId="info-title"
          onClose={() => setModal(null)}
        >
          <CloseButton
            onClick={() => setModal(null)}
            label="Chiudi informazioni"
          />
          <h2 id="info-title">
            Un piccolo <em>appunto.</em>
          </h2>
          {site.preview ? (
            <>
              <p>
                Questo è un concept di design per Spargolo. Il menu, i prezzi e
                gli orari selezionabili sono esempi da confermare con il locale.
              </p>
              <p>
                I dati dei moduli restano solo nella memoria di questa pagina.
                Nessun ordine o prenotazione viene inviato o salvato. Chiudendo
                il modulo o ricaricando la pagina, i recapiti inseriti vengono
                cancellati.
              </p>
            </>
          ) : (
            <p>
              Le richieste vengono inviate al locale solo quando premi il
              pulsante di invio. Il servizio è soggetto alla conferma del
              personale. Per allergie e intolleranze, chiedi sempre al locale.
            </p>
          )}
          <p>
            Per informazioni o una prenotazione reale, chiama{" "}
            <a href={`tel:${site.contact.phone}`}>{site.contact.phoneLabel}</a>.
          </p>
        </Dialog>
      )}
      <div
        className={`toast ${toast ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast?.text}
      </div>
    </>
  );
}
