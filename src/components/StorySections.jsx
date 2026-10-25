import { Fragment } from "react";
import { Kicker, Reveal } from "./Shared";

function Heading({ content }) {
  return (
    <h2>
      {content.heading.map((line) => (
        <Fragment key={line}>
          {line}
          <br />
        </Fragment>
      ))}
      <em>{content.emphasis}</em>
    </h2>
  );
}

export function Story({ site }) {
  const content = site.story;
  return (
    <section className="ritual section" id="rituale">
      <Kicker aside="NESSUNA FRETTA.">
        01 / IL NOSTRO MODO DI STARE INSIEME
      </Kicker>
      <div className="ritual-grid">
        <Reveal className="ritual-photo">
          <img src={content.image} alt={content.alt} loading="lazy" />
          <span className="photo-label">{content.caption}</span>
          <div className="photo-stamp">
            UN PO’
            <br />
            <em>come a casa.</em>
          </div>
        </Reveal>
        <Reveal className="ritual-copy">
          <p className="eyebrow burgundy">{content.eyebrow}</p>
          <Heading content={content} />
          {content.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <a className="text-link" href="#famiglia">
            Ti presentiamo la famiglia <span>↗</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function Family({ site }) {
  const content = site.family;
  return (
    <section className="family-section section" id="famiglia">
      <Kicker aside="LE PERSONE FANNO IL POSTO.">04 / DIETRO IL BANCONE</Kicker>
      <div className="family-grid">
        <Reveal className="family-copy">
          <p className="eyebrow burgundy">{content.eyebrow}</p>
          <Heading content={content} />
          {content.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <span className="handwritten">Ci vediamo al banco.</span>
        </Reveal>
        <Reveal as="figure" className="family-photo">
          <img src={content.image} alt={content.alt} loading="lazy" />
          <figcaption>{content.caption}</figcaption>
        </Reveal>
      </div>
    </section>
  );
}

export function Visit({ site, onBook }) {
  return (
    <section className="visit-section" id="dove">
      <div className="visit-image">
        <img src={site.visit.image} alt={site.visit.alt} loading="lazy" />
        <span>
          LA PORTA ROSSA.
          <br />
          LA SERATA GIUSTA.
        </span>
      </div>
      <div className="visit-copy">
        <p className="eyebrow">Il prossimo giro, qui.</p>
        <h2>
          Ti teniamo
          <br />
          <em>un posto?</em>
        </h2>
        <p>
          {site.contact.address}
          <br />
          Nel quartiere {site.contact.district}.
        </p>
        <div className="visit-hours">
          <span>{site.booking.hoursLabel}</span>
          <strong>{site.booking.hours}</strong>
          <span>{site.booking.closedLabel}</span>
          <strong>Ci riposiamo.</strong>
        </div>
        <button className="button butter" onClick={onBook}>
          Scegli la tua serata <span>↗</span>
        </button>
        <div className="visit-links">
          <a
            href={site.contact.directions}
            target="_blank"
            rel="noopener noreferrer"
          >
            Portami da voi ↗
          </a>
          <a href={`tel:${site.contact.phone}`}>{site.contact.phoneLabel} ↗</a>
        </div>
      </div>
    </section>
  );
}

export function Ribbon() {
  return (
    <div className="ribbon" aria-hidden="true">
      <div>
        {[0, 1, 2].map((i) => (
          <Fragment key={i}>
            UN CALICE, DUE CICCHETTI, MILLE COSE DA DIRSI <span>✳</span>{" "}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
