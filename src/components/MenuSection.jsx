import { useRef, useState } from "react";
import { money, cartTotal } from "../lib/domain";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePlayback } from "../hooks/usePlayback";
import { CloseButton, Dialog, Kicker } from "./Shared";

function DishMedia({ item }) {
  const ref = useRef(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  usePlayback(ref, !reduced);
  return item.video ? (
    <video
      ref={ref}
      src={item.video}
      muted
      loop
      playsInline
      preload="none"
      poster={item.image}
      aria-label={`Presentazione di ${item.name}`}
    />
  ) : (
    <img src={item.image} alt={item.name} loading="lazy" />
  );
}

export default function MenuSection({
  site,
  cart,
  lines,
  onQuantity,
  onBook,
  onOrder,
  onClear,
  onFullMenu,
}) {
  const [categoryId, setCategory] = useState(site.categories[0]?.id || "");
  const rail = useRef(null);
  const tabs = useRef([]);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const category =
    site.categories.find((c) => c.id === categoryId) || site.categories[0];
  const items = site.menu.filter(
    (item) => item.categoryId === category?.id && item.available,
  );
  const count = lines.reduce((total, item) => total + item.quantity, 0);
  const changeCategory = (id) => {
    setCategory(id);
    if (rail.current) rail.current.scrollLeft = 0;
  };
  const onTabKeyDown = (event, index) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % site.categories.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + site.categories.length) % site.categories.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = site.categories.length - 1;
    else return;
    event.preventDefault();
    changeCategory(site.categories[next].id);
    tabs.current[next]?.focus();
  };
  return (
    <section className="menu-section section" id="menu">
      <Kicker aside="DA GUARDARE. DA SCEGLIERE. DA CONDIVIDERE.">
        02 / PICCOLE COSE, FATTE BENE
      </Kicker>
      <div className="menu-heading">
        <div>
          <p className="eyebrow burgundy">Il banco delle tentazioni</p>
          <h2>
            Uno tira <em>l’altro.</em>
          </h2>
        </div>
        <p>
          Componi il tuo piccolo giro.
          <br />
          Scegli quello che ti ispira: al calice ci pensiamo dopo.
        </p>
      </div>
      <div className="menu-toolbar">
        <div className="tabs" role="tablist" aria-label="Categorie del menu">
          {site.categories.map((c, index) => (
            <button
              key={c.id}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              role="tab"
              id={`tab-${c.id}`}
              aria-controls="menu-panel"
              aria-selected={category?.id === c.id}
              tabIndex={category?.id === c.id ? 0 : -1}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              onClick={() => changeCategory(c.id)}
            >
              {c.name}
              <sup>
                {String(
                  site.menu.filter(
                    (item) => item.categoryId === c.id && item.available,
                  ).length,
                ).padStart(2, "0")}
              </sup>
            </button>
          ))}
        </div>
        <div className="rail-controls">
          <button
            aria-label="Scorri il menu a sinistra"
            onClick={() =>
              rail.current?.scrollBy({
                left: -330,
                behavior: reduced ? "instant" : "smooth",
              })
            }
          >
            ←
          </button>
          <button
            aria-label="Scorri il menu a destra"
            onClick={() =>
              rail.current?.scrollBy({
                left: 330,
                behavior: reduced ? "instant" : "smooth",
              })
            }
          >
            →
          </button>
        </div>
      </div>
      {site.preview && (
        <p className="demo-menu">
          MENU DIMOSTRATIVO · Composizioni e prezzi da confermare con il locale.
        </p>
      )}
      <div
        id="menu-panel"
        role="tabpanel"
        aria-labelledby={category ? `tab-${category.id}` : undefined}
        tabIndex={0}
      >
        <div className="menu-rail" ref={rail}>
          {items.map((item, index) => (
            <article className="menu-card" key={item.id}>
              <div className="dish-image">
                <DishMedia item={item} />
                <span className="dish-number">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {category.name.toUpperCase()}
                </span>
                <button
                  className={`dish-add ${cart[item.id] ? "selected" : ""}`}
                  onClick={() => onQuantity(item.id, 1)}
                  disabled={cart[item.id] >= 20}
                  aria-label={`Aggiungi ${item.name} al tuo giro`}
                >
                  {cart[item.id] || "+"}
                </button>
              </div>
              <div className="dish-meta">
                <h3>{item.name}</h3>
                <strong>{money(item.priceCents)}</strong>
              </div>
              <p className="dish-description">{item.description}</p>
            </article>
          ))}
          {!items.length && (
            <p className="empty-menu">
              Le proposte di questa categoria arriveranno presto.
            </p>
          )}
        </div>
      </div>
      <div className="menu-bottom">
        <span>Il menu segue l’ispirazione e la stagione.</span>
        <button className="text-link" onClick={onFullMenu}>
          Sfoglia tutto il menu <span>↗</span>
        </button>
      </div>
      {lines.length > 0 && (
        <div className="tasting-tray">
          <span className="tray-icon" aria-hidden="true">
            ✳
          </span>
          <div>
            <strong>Il tuo piccolo giro</strong>
            <p aria-live="polite">
              {count} {count === 1 ? "assaggio" : "assaggi"} ·{" "}
              {money(cartTotal(lines))}
              {site.preview ? " indicativi" : ""}
            </p>
          </div>
          <button className="text-link tray-reset" onClick={onClear}>
            Svuota
          </button>
          <button className="text-link" onClick={onOrder}>
            Rivedi la selezione <span>↗</span>
          </button>
          <button className="button green" onClick={onBook}>
            Ora, un tavolo <span>↗</span>
          </button>
        </div>
      )}
    </section>
  );
}

export function FullMenuDialog({ site, onClose, onBook }) {
  return (
    <Dialog
      className="full-menu-dialog"
      titleId="full-menu-title"
      onClose={onClose}
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow burgundy">Un assaggio del nostro mondo</p>
          <h2 id="full-menu-title">
            Il <em>menu.</em>
          </h2>
        </div>
        <CloseButton onClick={onClose} label="Chiudi menu" />
      </div>
      <p className="menu-disclaimer">
        {site.preview
          ? "Anteprima di design: nomi, ingredienti e prezzi sono illustrativi. Il menu definitivo e gli allergeni saranno forniti dal locale."
          : "Per allergie e intolleranze, chiedi sempre direttamente al personale prima di scegliere."}
      </p>
      {site.categories.map((category) => (
        <section className="full-menu-group" key={category.id}>
          <h3>{category.name}</h3>
          {site.menu
            .filter((item) => item.categoryId === category.id && item.available)
            .map((item) => (
              <div className="full-menu-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                  {item.allergens?.length > 0 && (
                    <p>Allergeni: {item.allergens.join(", ")}</p>
                  )}
                </div>
                <span>{money(item.priceCents)}</span>
              </div>
            ))}
        </section>
      ))}
      <button className="button green" onClick={onBook}>
        Ora, un tavolo <span>↗</span>
      </button>
    </Dialog>
  );
}
