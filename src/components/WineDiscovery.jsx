import { Fragment, useState } from "react";
import { Kicker } from "./Shared";

export default function WineDiscovery({ site }) {
  const [active, setActive] = useState(site.wineMoods[0].id);
  const index = Math.max(
    0,
    site.wineMoods.findIndex((item) => item.id === active),
  );
  const mood = site.wineMoods[index];
  return (
    <section className="wine-section section" id="vini">
      <Kicker aside="TI TROVIAMO UN CALICE.">03 / DIMMI COME TI SENTI</Kicker>
      <div className="wine-grid">
        <div className="wine-copy">
          <p className="eyebrow">La carta, senza la lezione.</p>
          <h2>
            Che serata
            <br />
            <em>hai in mente?</em>
          </h2>
          <p>
            Non serve conoscere ogni etichetta.
            <br />
            Partiamo da quello che ti piace.
          </p>
          <div
            className="wine-moods"
            role="group"
            aria-label="Scegli il carattere del tuo vino"
          >
            {site.wineMoods.map((item) => (
              <button
                key={item.id}
                className={item.id === active ? "active" : ""}
                aria-pressed={item.id === active}
                onClick={() => setActive(item.id)}
              >
                {item.label}
                <span>↗</span>
              </button>
            ))}
          </div>
        </div>
        <div className="wine-stage">
          <div className="wine-orbit orbit-one" aria-hidden="true" />
          <div className="wine-orbit orbit-two" aria-hidden="true" />
          <span className="wine-stage-label">IL TUO MOOD, NEL CALICE</span>
          <img src={mood.image} alt={mood.alt} loading="lazy" />
          <div className="wine-note" aria-live="polite">
            <span>
              {String(index + 1).padStart(2, "0")} / {mood.type.toUpperCase()}
            </span>
            <h3>
              {mood.heading.map((line, i) => (
                <Fragment key={line}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </h3>
            <p>{mood.description}</p>
            <span className="wine-pairing">{mood.pairing}</span>
          </div>
          <small className="wine-demo">
            Un gioco di gusto. La selezione reale la scopri al banco.
          </small>
        </div>
      </div>
    </section>
  );
}
