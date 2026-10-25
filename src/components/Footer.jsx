import { Wordmark } from "./Shared";

export default function Footer({ site, onBook, onInfo }) {
  return (
    <>
      <footer>
        <div className="footer-top">
          <Wordmark name={site.brand.name} />
          <p>
            Venezia nell’anima.
            <br />
            Milano nel cuore.
          </p>
          <a
            href={site.contact.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Segui le nostre serate ↗<br />
            <small>{site.contact.instagramLabel}</small>
          </a>
        </div>
        <div className="footer-bottom">
          <span>
            {site.brand.name.toUpperCase()} · {site.brand.tagline.toUpperCase()}
          </span>
          <span>
            {site.preview
              ? "Concept interattivo · Menu e richieste dimostrativi"
              : site.contact.address}
          </span>
          <button onClick={onInfo}>Informazioni</button>
          <a href="#main">Torna su ↑</a>
        </div>
      </footer>
      <div className="mobile-bottom">
        <a href="#menu">
          Il menu <span>↗</span>
        </a>
        <button onClick={onBook}>
          Un tavolo per noi <span>↗</span>
        </button>
      </div>
    </>
  );
}
