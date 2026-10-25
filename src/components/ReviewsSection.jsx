import { useState } from "react";
import { Kicker } from "./Shared";

export default function ReviewsSection({ reviews, onBook }) {
  const [active, setActive] = useState(0);
  if (!reviews?.items?.length) return null;
  const index = active % reviews.items.length;
  const review = reviews.items[index];
  const select = (next) =>
    setActive((next + reviews.items.length) % reviews.items.length);

  return (
    <section
      className="reviews-section section"
      id="recensioni"
      aria-labelledby="reviews-title"
    >
      <Kicker aside="LE PAROLE DI CHI È STATO QUI.">05 / DICONO DI NOI</Kicker>
      <div className="reviews-heading">
        <div>
          <p className="eyebrow burgundy">Le persone, prima di tutto.</p>
          <h2 id="reviews-title">
            Le serate belle
            <br />
            <em>lasciano parole.</em>
          </h2>
        </div>
        <p>
          Un buon calice si ricorda.
          <br />
          Come le persone con cui lo hai condiviso.
        </p>
      </div>

      <div className="reviews-editorial">
        <div className="review-story">
          <span className="review-quote-mark" aria-hidden="true">
            “
          </span>
          <div className="review-excerpt" aria-live="polite" aria-atomic="true">
            <div
              className="review-stars"
              role="img"
              aria-label={`${review.rating} stelle su 5`}
            >
              {"★".repeat(review.rating)}
            </div>
            <blockquote key={review.id}>
              <p>{review.quote}</p>
            </blockquote>
            <div className="review-byline">
              <span className="review-monogram" aria-hidden="true">
                {review.author[0]}
              </span>
              <div>
                <cite>{review.author}</cite>
                <span>{review.source} · estratto</span>
              </div>
            </div>
          </div>
          <div className="review-navigation">
            <div
              className="review-dots"
              role="group"
              aria-label="Scegli una recensione"
            >
              {reviews.items.map((item, i) => (
                <button
                  key={item.id}
                  aria-label={`Leggi la recensione di ${item.author}`}
                  aria-pressed={i === index}
                  onClick={() => select(i)}
                >
                  <span />
                </button>
              ))}
            </div>
            <span className="review-counter" aria-hidden="true">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(reviews.items.length).padStart(2, "0")}
            </span>
            <div className="review-arrows">
              <button
                aria-label="Recensione precedente"
                onClick={() => select(index - 1)}
              >
                ←
              </button>
              <button
                aria-label="Recensione successiva"
                onClick={() => select(index + 1)}
              >
                →
              </button>
            </div>
          </div>
        </div>
        <figure className="review-scene">
          <img
            key={review.id}
            src={review.image}
            alt={review.imageAlt}
            loading="lazy"
          />
          <figcaption>
            Ci sono posti. E poi ci sono <em>i posti del cuore.</em>
          </figcaption>
        </figure>
      </div>

      <div className="reviews-closing">
        <p>{reviews.sourceNote}</p>
        <button className="text-link" onClick={onBook}>
          La prossima serata, da noi <span>↗</span>
        </button>
      </div>
    </section>
  );
}
