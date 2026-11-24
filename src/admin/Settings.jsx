import { useState } from "react";
import { adminApi } from "./api.js";
import { Check, Field, LoadStatus, SaveBar, StatusText, useAction, useLoad } from "./shared.jsx";

const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const words = (text) => text.split(/[,\s]+/).filter(Boolean);
const lines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);

function StoryFields({ value, change }) {
  const field = (key) => ({ value: value[key], onChange: (e) => change({ ...value, [key]: e.target.value }) });
  return (
    <div className="admin-fields">
      <Field label="Etichetta"><input required maxLength={80} {...field("eyebrow")} /></Field>
      <Field label="Titolo in corsivo"><input required maxLength={120} {...field("emphasis")} /></Field>
      <Field label="Titolo" detail="Una riga per ciascuna parte del titolo." wide><textarea rows="2" required {...field("heading")} /></Field>
      <Field label="Testo" detail="Una riga per paragrafo." wide><textarea rows="4" required {...field("paragraphs")} /></Field>
    </div>
  );
}

function SettingsForm({ settings }) {
  const [values, set] = useState(() => ({
    ...settings,
    booking: {
      ...settings.booking,
      slots: settings.booking.slots.join(", "),
      closedDates: settings.booking.closedDates.join("\n"),
      capacityPerSlot: settings.booking.capacityPerSlot ?? "",
    },
    content: {
      ...settings.content,
      story: { ...settings.content.story, heading: settings.content.story.heading.join("\n"), paragraphs: settings.content.story.paragraphs.join("\n") },
      family: { ...settings.content.family, heading: settings.content.family.heading.join("\n"), paragraphs: settings.content.family.paragraphs.join("\n") },
    },
  }));
  const [notice, setNotice] = useState("");
  const action = useAction();
  const booking = (key) => ({
    value: values.booking[key],
    onChange: (e) => set({ ...values, booking: { ...values.booking, [key]: e.target.value } }),
  });
  const updateContent = (group, data) => set((old) => ({
    ...old, content: { ...old.content, [group]: data },
  }));
  const content = (group, key) => ({
    value: values.content[group][key],
    onChange: (e) => updateContent(group, { ...values.content[group], [key]: e.target.value }),
  });
  const submit = (event) => {
    event.preventDefault();
    setNotice("");
    return action.run(async () => {
      const rules = values.booking;
      const result = await adminApi("/settings", { method: "PUT", body: {
        ...values,
        booking: { ...rules, slots: words(rules.slots), closedDates: words(rules.closedDates),
          maxGuests: Number(rules.maxGuests), minLeadMinutes: Number(rules.minLeadMinutes),
          horizonDays: Number(rules.horizonDays), capacityPerSlot: rules.capacityPerSlot === "" ? null : Number(rules.capacityPerSlot) },
        content: {
          ...values.content,
          story: { ...values.content.story, heading: lines(values.content.story.heading), paragraphs: lines(values.content.story.paragraphs) },
          family: { ...values.content.family, heading: lines(values.content.family.heading), paragraphs: lines(values.content.family.paragraphs) },
        },
      } });
      set({ ...values, revision: result.revision });
      setNotice("Impostazioni pubblicate.");
    });
  };

  return (
    <form onSubmit={submit} className="admin-settings">
      <section className="admin-card">
        <div className="admin-card-head"><h2>Richieste online</h2></div>
        <Check label="Accetta prenotazioni e richieste dal menu" checked={values.live} onChange={(e) => set({ ...values, live: e.target.checked })} />
        <p className="admin-muted">Attiva dopo aver verificato il menu e gli orari. Le nuove richieste arrivano in attesa di conferma.</p>
      </section>
      <section className="admin-card">
        <div className="admin-card-head"><h2>Orari e prenotazioni</h2></div>
        <div className="admin-fields">
          <Field label="Giorni di apertura mostrati"><input required maxLength={90} {...booking("hoursLabel")} /></Field>
          <Field label="Orario mostrato"><input required maxLength={90} {...booking("hours")} /></Field>
          <Field label="Giorni di chiusura mostrati"><input required maxLength={90} {...booking("closedLabel")} /></Field>
          <Field label="Posti per fascia" detail="Limite facoltativo di coperti confermati allo stesso orario."><input type="number" min="1" max="1000" {...booking("capacityPerSlot")} /></Field>
          <Field label="Persone per prenotazione"><input type="number" required min="1" max="100" {...booking("maxGuests")} /></Field>
          <Field label="Giorni prenotabili in anticipo"><input type="number" required min="1" max="365" {...booking("horizonDays")} /></Field>
          <Field label="Preavviso minimo (minuti)"><input type="number" required min="0" max="1440" {...booking("minLeadMinutes")} /></Field>
          <Field label="Orari prenotabili" detail="Orari di Milano nel formato HH:MM, separati da virgole." wide><input required {...booking("slots")} /></Field>
          <Field label="Chiusure straordinarie" detail="Inserisci una data AAAA-MM-GG per riga." wide><textarea rows="3" {...booking("closedDates")} /></Field>
        </div>
        <fieldset className="admin-weekdays">
          <legend>Giorni chiusi ogni settimana</legend>
          {days.map((day, index) => <Check key={day} label={day}
            checked={values.booking.closedWeekdays.includes(index)}
            onChange={(e) => set({ ...values, booking: { ...values.booking, closedWeekdays: e.target.checked
              ? [...values.booking.closedWeekdays, index] : values.booking.closedWeekdays.filter((item) => item !== index) } })}
          />)}
        </fieldset>
      </section>
      <section className="admin-card">
        <div className="admin-card-head"><h2>Contatti e indirizzo</h2></div>
        <div className="admin-fields">
          {[
            ["address", "Indirizzo"], ["district", "Quartiere"], ["phone", "Telefono internazionale"],
            ["phoneLabel", "Telefono mostrato"], ["instagram", "URL Instagram"], ["instagramLabel", "Nome Instagram"], ["directions", "URL indicazioni"],
          ].map(([key, label]) => <Field label={label} key={key}><input required {...content("contact", key)} /></Field>)}
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card-head"><h2>Testi del sito</h2></div>
        <details open className="admin-settings-group">
          <summary>Homepage</summary>
          <div className="admin-fields">
            <Field label="Etichetta"><input required maxLength={100} {...content("hero", "eyebrow")} /></Field>
            <Field label="Titolo"><input required maxLength={100} {...content("hero", "heading")} /></Field>
            <Field label="Titolo in corsivo"><input required maxLength={100} {...content("hero", "emphasis")} /></Field>
            <Field label="Introduzione" wide><textarea rows="3" required maxLength={420} {...content("hero", "description")} /></Field>
          </div>
        </details>
        <details open className="admin-settings-group">
          <summary>La nostra storia</summary>
          <StoryFields value={values.content.story} change={(value) => updateContent("story", value)} />
        </details>
        <details open className="admin-settings-group">
          <summary>La famiglia</summary>
          <StoryFields value={values.content.family} change={(value) => updateContent("family", value)} />
        </details>
      </section>
      <StatusText error>{action.error}</StatusText>
      <StatusText>{notice}</StatusText>
      <SaveBar busy={action.busy} />
    </form>
  );
}

export default function Settings() {
  const load = useLoad("/settings");
  return load.data ? <SettingsForm settings={load.data} /> : <LoadStatus load={load} />;
}
