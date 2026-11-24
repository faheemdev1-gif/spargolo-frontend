import { useState } from "react";
import { money } from "../lib/domain.js";
import { adminApi, euroInput, preparePhoto, readEuros } from "./api.js";
import { Check, Editor, Field, LoadStatus, SaveBar, StatusText, useAction, useLoad } from "./shared.jsx";

function CategoryEditor({ category, close, saved }) {
  const [values, set] = useState(category || { name: "", sortOrder: 0, archived: false });
  const action = useAction();
  const submit = (event) => {
    event.preventDefault();
    return action.run(async () => {
      await adminApi(category ? `/categories/${category.id}` : "/categories", {
        method: category ? "PATCH" : "POST",
        body: { ...values, sortOrder: Number(values.sortOrder) },
      });
      saved();
    });
  };
  return (
    <Editor title={category ? "Modifica categoria" : "Nuova categoria"} close={close}>
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-fields">
          <Field label="Nome categoria">
            <input required autoFocus maxLength={70} value={values.name} onChange={(e) => set({ ...values, name: e.target.value })} />
          </Field>
          <Field label="Posizione nel menu" detail="I numeri più bassi vengono mostrati per primi.">
            <input type="number" required min="0" max="10000" value={values.sortOrder} onChange={(e) => set({ ...values, sortOrder: e.target.value })} />
          </Field>
        </div>
        <Check label="Archivia categoria e nascondi i suoi prodotti" checked={values.archived} onChange={(e) => set({ ...values, archived: e.target.checked })} />
        <StatusText error>{action.error}</StatusText>
        <SaveBar busy={action.busy} close={close} />
      </form>
    </Editor>
  );
}

function ProductEditor({ item, categories, categoryId, close, saved }) {
  const validCategories = categories.filter((category) => !category.archived || item?.categoryId === category.id);
  const [values, set] = useState(() => item ? {
    ...item, price: euroInput(item.priceCents), allergens: item.allergens.join(", "),
  } : {
    categoryId: validCategories.find((category) => category.id === categoryId)?.id || validCategories[0]?.id || "",
    name: "", description: "", price: "", imageUrl: "", videoUrl: "", allergens: "",
    available: true, sortOrder: 0, archived: false,
  });
  const [photo, setPhoto] = useState(null);
  const action = useAction();
  const field = (key) => ({ value: values[key], onChange: (e) => set({ ...values, [key]: e.target.value }) });
  const submit = (event) => {
    event.preventDefault();
    return action.run(async () => {
      const body = { ...values, priceCents: readEuros(values.price), sortOrder: Number(values.sortOrder),
        allergens: values.allergens.split(",").map((value) => value.trim()).filter(Boolean) };
      if (photo) body.photoData = await preparePhoto(photo);
      await adminApi(item ? `/products/${item.id}` : "/products", { method: item ? "PATCH" : "POST", body });
      saved();
    });
  };
  return (
    <Editor title={item ? "Modifica prodotto" : "Nuovo prodotto"} close={close}>
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-fields">
          <Field label="Nome prodotto" wide><input required autoFocus maxLength={100} {...field("name")} /></Field>
          <Field label="Categoria">
            <select required {...field("categoryId")}>
              <option value="">Scegli una categoria</option>
              {validCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.archived ? " · Archiviata" : ""}</option>)}
            </select>
          </Field>
          <Field label="Prezzo (€)"><input inputMode="decimal" required placeholder="6,50" {...field("price")} /></Field>
          <Field label="Descrizione" wide><textarea rows="3" maxLength={700} {...field("description")} /></Field>
          <Field label="Allergeni" detail="Separa le voci con una virgola." wide><input placeholder="Glutine, latte" {...field("allergens")} /></Field>
          <Field label="Posizione nel menu"><input type="number" required min="0" max="10000" {...field("sortOrder")} /></Field>
          <Field label="Carica una foto" detail="JPEG, PNG o WebP. La foto viene ridimensionata al salvataggio.">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files[0] || null)} />
          </Field>
          {item?.image && <div className="admin-photo-field">
            <img className="admin-thumb" src={item.image} alt={item.name} />
            {item.photoId && <Check label="Rimuovi la foto caricata" checked={Boolean(values.removePhoto)} onChange={(e) => set({ ...values, removePhoto: e.target.checked })} />}
          </div>}
          <details className="admin-wide admin-media">
            <summary>Link a una foto o a un video</summary>
            <Field label="URL foto"><input placeholder="https://…" {...field("imageUrl")} /></Field>
            <Field label="URL video"><input placeholder="https://…" {...field("videoUrl")} /></Field>
          </details>
        </div>
        <div className="admin-switches">
          <Check label="Disponibile nel menu" checked={values.available} onChange={(e) => set({ ...values, available: e.target.checked })} />
          <Check label="Archivia prodotto" checked={values.archived} onChange={(e) => set({ ...values, archived: e.target.checked })} />
        </div>
        <StatusText error>{action.error}</StatusText>
        <SaveBar busy={action.busy} close={close} />
      </form>
    </Editor>
  );
}

export default function Catalog() {
  const load = useLoad("/catalog");
  const [active, setActive] = useState("");
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");
  if (!load.data) return <LoadStatus load={load} />;
  const { categories, products } = load.data;
  const visible = active ? products.filter((item) => item.categoryId === active) : products;
  const close = () => setEditor(null);
  const saved = () => {
    close();
    load.refresh();
    setNotice("Menu aggiornato.");
  };
  return (
    <div className="admin-catalog">
      <section className="admin-card admin-category-card">
        <div className="admin-card-head">
          <h2>Categorie</h2>
          <button type="button" onClick={() => setEditor({ type: "category" })}>Nuova categoria</button>
        </div>
        <ul className="admin-category-list">
          {categories.map((category) => (
            <li key={category.id}>
              <div><strong>{category.name}</strong><small>{category.archived ? "Archiviata" : `Posizione ${category.sortOrder}`}</small></div>
              <button type="button" onClick={() => setEditor({ type: "category", record: category })} aria-label={`Modifica categoria ${category.name}`}>Modifica</button>
            </li>
          ))}
        </ul>
        {!categories.length && <p className="admin-muted">Aggiungi la prima categoria del menu.</p>}
      </section>
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Prodotti</h2>
          <button className="admin-primary" type="button" disabled={!categories.some((category) => !category.archived)} onClick={() => setEditor({ type: "product" })}>Nuovo prodotto</button>
        </div>
        <Field label="Filtra per categoria">
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">Tutte le categorie</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <StatusText>{notice}</StatusText>
        <LoadStatus load={load} />
        <ul className="admin-product-list">
          {visible.map((item) => (
            <li key={item.id}>
              {item.image ? <img className="admin-thumb" src={item.image} alt="" loading="lazy" /> : <span className="admin-thumb admin-empty-photo" aria-hidden="true" />}
              <div className="admin-product-name"><strong>{item.name}</strong><small>{item.archived ? "Archiviato" : item.available ? "Disponibile" : "Non disponibile"}</small></div>
              <strong className="admin-price">{money(item.priceCents)}</strong>
              <button type="button" onClick={() => setEditor({ type: "product", record: item })} aria-label={`Modifica prodotto ${item.name}`}>Modifica</button>
            </li>
          ))}
        </ul>
        {!visible.length && <p className="admin-muted">Nessun prodotto in questa categoria.</p>}
      </section>
      {editor?.type === "category" && <CategoryEditor category={editor.record} close={close} saved={saved} />}
      {editor?.type === "product" && <ProductEditor item={editor.record} categories={categories} categoryId={active} close={close} saved={saved} />}
    </div>
  );
}
