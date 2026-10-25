import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";

export function Wordmark({ onClick, name = "Spargolo" }) {
  return (
    <a
      href="#main"
      className="wordmark"
      onClick={onClick}
      aria-label={`${name}, inizio`}
    >
      {name.toLowerCase()}
      <span className="logo-dot" aria-hidden="true">
        ✳
      </span>
    </a>
  );
}

export function Kicker({ children, aside }) {
  return (
    <div className="section-kicker">
      <span>{children}</span>
      {aside && <span>{aside}</span>}
    </div>
  );
}

export function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible || reduced ? "visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Dialog({ children, className = "", titleId, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const focus = document.activeElement;
    dialog.showModal();
    document.body.classList.add("modal-open");
    return () => {
      dialog.close();
      document.body.classList.remove("modal-open");
      if (focus?.isConnected) focus.focus();
    };
  }, []);
  const handleBackdrop = (event) => {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeRef.current();
  };
  return createPortal(
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdrop}
    >
      {children}
    </dialog>,
    document.body,
  );
}

export function CloseButton({ onClick, label = "Chiudi" }) {
  return (
    <button
      type="button"
      className="close-dialog"
      onClick={onClick}
      aria-label={label}
    >
      ×
    </button>
  );
}

export function PreviewNotice({ children }) {
  return (
    <div className="preview-notice">
      <i aria-hidden="true" />
      {children}
    </div>
  );
}

export function FormFields({ values, onChange, prefix, disabled = false }) {
  const field = (name) => ({
    value: values[name],
    onChange: (event) => onChange({ ...values, [name]: event.target.value }),
    disabled,
  });
  return (
    <div className="form-grid">
      <label className="wide" htmlFor={`${prefix}-name`}>
        Come ti chiami? *
        <input
          id={`${prefix}-name`}
          name="name"
          autoComplete="name"
          required
          maxLength={90}
          placeholder="Nome e cognome"
          {...field("name")}
        />
      </label>
      <label className="wide" htmlFor={`${prefix}-email`}>
        La tua email *
        <input
          id={`${prefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={150}
          placeholder="ciao@esempio.it"
          {...field("email")}
        />
      </label>
      <label className="wide" htmlFor={`${prefix}-phone`}>
        Un numero per contattarti <span>(facoltativo)</span>
        <input
          id={`${prefix}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={35}
          placeholder="+39"
          {...field("phone")}
        />
      </label>
      <label className="wide" htmlFor={`${prefix}-notes`}>
        Qualcosa da raccontarci? <span>(facoltativo)</span>
        <textarea
          id={`${prefix}-notes`}
          name="notes"
          maxLength={700}
          placeholder="Una preferenza, un’occasione speciale…"
          {...field("notes")}
        />
      </label>
    </div>
  );
}
