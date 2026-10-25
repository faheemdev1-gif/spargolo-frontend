import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePlayback } from "../hooks/usePlayback";

export default function Hero({ site, onBook }) {
  const [active, setActive] = useState(site.hero.scenes[0].id);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState("CIAO, MILANO");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 760px)");
  const videoRef = useRef(null);
  const sceneIndex = Math.max(
    0,
    site.hero.scenes.findIndex((scene) => scene.id === active),
  );
  const scene = site.hero.scenes[sceneIndex];
  usePlayback(videoRef, scene.type === "video" && !paused && !reduced);
  useEffect(() => {
    const tick = () =>
      setTime(
        `MILANO, ${new Intl.DateTimeFormat("it-IT", { timeZone: site.booking.timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date())}`,
      );
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [site.booking.timeZone]);
  return (
    <section className="hero-reimagined" aria-labelledby="hero-title">
      <div
        className="opening-media"
        aria-label="Un assaggio del mondo di Spargolo"
      >
        {site.hero.scenes.map((item) =>
          item.type === "video" ? (
            <video
              key={item.id}
              ref={videoRef}
              className={`opening-visual ${scene.id === item.id ? "is-active" : ""}`}
              muted
              loop
              playsInline
              preload="metadata"
              poster={item.poster}
              src={mobile ? item.mobileSrc : item.src}
              aria-label={item.alt}
              aria-hidden={scene.id !== item.id}
            />
          ) : (
            <img
              key={item.id}
              className={`opening-visual ${scene.id === item.id ? "is-active" : ""}`}
              id={`opening-${item.id}`}
              src={item.src}
              alt={item.alt}
              aria-hidden={scene.id !== item.id}
              loading="lazy"
            />
          ),
        )}
        <div className="opening-shade" aria-hidden="true" />
        <div className="opening-topline">
          <span>VINI, CICCHETTI & BUONA COMPAGNIA</span>
          <span>{time}</span>
        </div>
        <div className="opening-scene-copy">
          <span className="opening-scene-label">
            {String(sceneIndex + 1).padStart(2, "0")} /{" "}
            {scene.caption.toUpperCase()}
          </span>
          <p>
            {scene.heading}
            <br />
            <em>{scene.emphasis}</em>
          </p>
        </div>
        <div className="opening-controls">
          <div
            className="scene-picker"
            role="group"
            aria-label="Esplora il mondo di Spargolo"
          >
            {site.hero.scenes.map((item, index) => (
              <button
                key={item.id}
                data-scene={item.id}
                aria-pressed={scene.id === item.id}
                onClick={() => setActive(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </div>
          {scene.type === "video" && (
            <button
              className="opening-pause"
              aria-label={
                paused || reduced
                  ? "Riproduci il video"
                  : "Metti in pausa il video"
              }
              onClick={() => setPaused(!paused)}
              disabled={reduced}
              title={
                reduced
                  ? "Movimento ridotto nelle preferenze del dispositivo"
                  : undefined
              }
            >
              {paused || reduced ? "▶" : "Ⅱ"}
            </button>
          )}
        </div>
      </div>
      <div className="opening-introduction">
        <p className="eyebrow burgundy">{site.hero.eyebrow}</p>
        <h1 id="hero-title">
          {site.hero.heading} <em>{site.hero.emphasis}</em>
        </h1>
        <p>{site.hero.description}</p>
        <div className="opening-actions">
          <button className="button opening-book" onClick={onBook}>
            Prenota la tua serata <span>↗</span>
          </button>
          <a href="#menu" className="text-link">
            Lasciati tentare dal menu <span>↓</span>
          </a>
        </div>
        <span className="opening-address">
          {site.contact.address.toUpperCase()} ·{" "}
          {site.contact.district.toUpperCase()}
        </span>
      </div>
    </section>
  );
}
