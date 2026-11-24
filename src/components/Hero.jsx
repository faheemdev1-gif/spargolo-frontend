import { useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePlayback } from "../hooks/usePlayback";

export default function Hero({ site, onBook }) {
  const { scenes } = site.hero;
  const [active, setActive] = useState(
    () => scenes.find((scene) => scene.id === "room")?.id ?? scenes[0].id,
  );
  const [paused, setPaused] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 760px)");
  const videoRef = useRef(null);
  const scene = scenes.find((item) => item.id === active) ?? scenes[0];
  const isVideo = scene.type === "video";
  usePlayback(videoRef, isVideo && !paused && !reduced);

  return (
    <section className="hero-reimagined" aria-labelledby="hero-title">
      <div className="opening-introduction">
        <p className="eyebrow">{site.hero.eyebrow}</p>
        <h1 id="hero-title">
          {site.hero.heading} <em>{site.hero.emphasis}</em>
        </h1>
        <p className="opening-description">{site.hero.description}</p>
        <div className="opening-actions">
          <button className="button opening-book" onClick={onBook}>
            Prenota un tavolo
          </button>
          <a href="#menu" className="text-link">
            Esplora il menu
          </a>
        </div>
        <a className="opening-address" href="#dove">
          {site.contact.address} · {site.contact.district}
        </a>
      </div>
      <div className="opening-gallery">
        <figure className="opening-media">
          {isVideo ? (
            <video
              key={scene.id}
              ref={videoRef}
              className="opening-visual"
              muted
              loop
              playsInline
              preload="metadata"
              poster={scene.poster}
              src={mobile ? scene.mobileSrc || scene.src : scene.src}
              aria-label={scene.alt}
            />
          ) : (
            <img
              key={scene.id}
              className="opening-visual"
              data-scene={scene.id}
              src={scene.src}
              alt={scene.alt}
              fetchPriority={scene.id === "room" ? "high" : "auto"}
            />
          )}
          {isVideo && !reduced && (
            <button
              type="button"
              className="opening-pause"
              aria-label={paused ? "Riproduci il video" : "Metti in pausa il video"}
              onClick={() => setPaused(!paused)}
            >
              <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
            </button>
          )}
        </figure>
        <div
          className="scene-picker"
          role="group"
          aria-label="Esplora il mondo di Spargolo"
        >
          {scenes.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={scene.id === item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
