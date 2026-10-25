import { useState } from "react";
import { Wordmark } from "./Shared";

export default function Header({ site, onBook }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["#rituale", "Il nostro mondo"],
    ["#menu", "Il menu"],
    ["#vini", "I vini"],
    ["#dove", "Vieni a trovarci"],
  ];
  return (
    <header className="header">
      <Wordmark name={site.brand.name} onClick={() => setOpen(false)} />
      <nav
        id="main-navigation"
        aria-label="Navigazione principale"
        className={open ? "open" : ""}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
      <button
        className="nav-book"
        onClick={() => {
          setOpen(false);
          onBook();
        }}
      >
        Un tavolo per noi <span>↗</span>
      </button>
      <button
        className="mobile-toggle"
        aria-label={open ? "Chiudi navigazione" : "Apri navigazione"}
        aria-controls="main-navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
      </button>
    </header>
  );
}
