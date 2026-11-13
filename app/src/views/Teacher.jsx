import { useState } from "react";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { ModuleIntro } from "../components/ui.jsx";
import { normalizeUrl, shareLink } from "../lib/settings.js";
import ClassReport from "./ClassReport.jsx";

const TEXT = {
  de: {
    eyebrow: "Für Lehrkräfte", title: "Einstellungen und Ablauf",
    lead: "Hier stellen Sie das Bildmodell für Modul 2 ein, verteilen den Link an die Klasse und setzen bei Bedarf den Spielstand zurück.",
    s1: "1. Eigenes Bildmodell (optional, ca. 30–60 Minuten)",
    steps: [
      <>Öffnen Sie <a href="https://teachablemachine.withgoogle.com/train/image" target="_blank" rel="noopener noreferrer">Teachable Machine</a> und wählen Sie <b>Image Project → Standard image model</b>.</>,
      <>Legen Sie zwei Klassen an: <b>PET</b> und <b>Kein PET</b>.</>,
      "Nehmen Sie pro Klasse 50 bis 100 Fotos auf, mit wechselndem Licht, Hintergrund und Winkel. Für „Kein PET“ eignen sich Glas, Dosen, Getränkekartons, Joghurtbecher und PVC-Flaschen.",
      "Nehmen Sie bewusst auch schwierige Fälle auf: zerdrückte Flaschen, Flaschen mit Etikett, grüne PET-Flaschen. Genau an diesen Fällen entstehen die Fehler, über die man im Unterricht sprechen kann.",
      <><b>Train Model → Export Model → Upload my model</b>, dann den Link kopieren.</>
    ],
    noModel: "Ohne eigenes Modell nutzt die App das vortrainierte MobileNet von Google. Es erkennt Plastikflaschen, kennt aber keine Kunststoffarten.",
    s2: "2. Modell-Link eintragen", modelLabel: "Link zum Teachable-Machine-Modell (https://…)",
    load: "Modell laden", remove: "Modell entfernen", invalid: "Bitte einen https-Link von Teachable Machine eintragen.",
    loading: "Modell wird geladen …", mn: "Kein eigenes Modell eingestellt: Die App nutzt MobileNet.", ok: n => `Eigenes Modell geladen · ${n} Klassen`,
    petClass: "Welche Klasse steht für PET?",
    s3: "3. Link für die Klasse", share: "Wer diesen Link öffnet, hat Modell und Sprache sofort eingestellt.",
    copy: "Link kopieren", copied: "Kopiert",
    s4: "Hinweise für den Unterricht",
    notes: [
      "Die Kamera funktioniert nur über https (z. B. Netlify), nicht beim Öffnen der Datei vom Desktop.",
      "Beim ersten Start fragt der Browser nach der Kamera. Wurde „Blockieren“ gewählt: Kamera-Symbol in der Adresszeile anklicken und zulassen.",
      "Die KI-Modelle werden beim ersten Öffnen eines Moduls geladen (einige MB). Im Schulnetz lohnt es sich, die Module 1, 2 und 7 vorab einmal zu öffnen.",
      <>Vor der Stunde auf einem Schülergerät den <a href="#check">Technik-Check</a> starten: Er zeigt in 20 Sekunden, was funktioniert (Kamera, KI-Modelle, Vorlesen, Assistent).</>,
      "Datenschutz: Kamerabilder und Eingaben verlassen das Gerät nicht. Gespeichert werden nur Einstellungen und Spielstand im Browser.",
      "Empfohlener Ablauf (90 Minuten): Vortest (5) · Module 1–4 (35) · Pause · Module 5–8 (30) · Capstone mit Quiz (10) · Nachtest (10).",
      "Vor- und Nachtest sind in der App eingebaut (12 identische Aufgaben, Paper Abschnitt V). Die Schüler:innen geben am Ende über den Lernbericht ihre Ergebnisdatei oder ihren Ergebnis-Code ab; die Auswertung oben berechnet daraus Mittelwerte, t-Test und Effektstärke."
    ],
    reset: "Spielstand auf diesem Gerät zurücksetzen", resetDone: "Spielstand zurückgesetzt.",
    aiH: "KI-Assistent „Frag RecyBot“ (Module 2, 4, 6, 7)",
    aiLead: "Der Assistent kennt den Spielstand und gibt Denkanstöße, ohne Lösungen zu verraten. Ist ein Sprachmodell verbunden, beantwortet er auch freie Fragen. Sonst gibt er berechnete Offline-Tipps.",
    aiToggle: "Assistent für diese Klasse anzeigen",
    aiSetup: "Sprachmodell verbinden (optional):",
    aiSteps: [
      <>Kostenlosen Schlüssel bei <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq</a> erstellen (ohne Kreditkarte).</>,
      <>Bei Netlify unter <b>Site configuration → Environment variables</b> eintragen: Name <code>GROQ_API_KEY</code>, Wert = der Schlüssel.</>,
      <>Die Seite über Git oder die Netlify-CLI veröffentlichen (<code>npx netlify deploy --prod</code>). Beim reinen Hochladen per Drag & Drop wird die Server-Funktion nicht mit veröffentlicht; dann bleibt es bei Offline-Tipps.</>,
      "Datenschutz: Gesendet werden nur die Frage und der Spielstand, kein Name und kein Bild. Groq speichert Anfragen standardmäßig nicht. Bei Minderjährigen gehört der Hinweis trotzdem in die Einwilligung. Gratis-Zugänge von Gemini oder Mistral nicht verwenden: Dort dürfen Anfragen zum Training genutzt werden.",
      "Gratis-Limit: etwa 1.000 Anfragen pro Tag mit dem großen Modell, danach schaltet die App automatisch auf ein kleineres Modell um. Für eine Klasse reicht das gut."
    ]
  },
  en: {
    eyebrow: "For teachers", title: "Settings and lesson flow",
    lead: "Set up the image model for module 2, share the link with your class and reset the game progress when needed.",
    s1: "1. Your own image model (optional, about 30–60 minutes)",
    steps: [
      <>Open <a href="https://teachablemachine.withgoogle.com/train/image" target="_blank" rel="noopener noreferrer">Teachable Machine</a> and choose <b>Image Project → Standard image model</b>.</>,
      <>Create two classes: <b>PET</b> and <b>Not PET</b>.</>,
      "Take 50 to 100 photos per class with varied light, backgrounds and angles. Glass, cans, drink cartons, yoghurt pots and PVC bottles work well for “Not PET”.",
      "Deliberately include tricky cases: crushed bottles, bottles with labels, green PET bottles. These are exactly where the errors happen that are worth discussing in class.",
      <><b>Train Model → Export Model → Upload my model</b>, then copy the link.</>
    ],
    noModel: "Without your own model the app uses Google's pre-trained MobileNet. It recognises plastic bottles but does not know plastic types.",
    s2: "2. Enter the model link", modelLabel: "Link to the Teachable Machine model (https://…)",
    load: "Load model", remove: "Remove model", invalid: "Please enter an https link from Teachable Machine.",
    loading: "Loading model …", mn: "No model of your own: the app uses MobileNet.", ok: n => `Your model is loaded · ${n} classes`,
    petClass: "Which class stands for PET?",
    s3: "3. Link for your class", share: "Anyone who opens this link gets the model and language set automatically.",
    copy: "Copy link", copied: "Copied",
    s4: "Notes for the classroom",
    notes: [
      "The camera only works over https (e.g. Netlify), not when the file is opened from the desktop.",
      "On first use the browser asks for camera access. If it was blocked, click the camera icon in the address bar and allow it.",
      "The AI models load the first time a module is opened (a few MB). On a school network it helps to open modules 1, 2 and 7 once beforehand.",
      <>Before the lesson, run the <a href="#check">tech check</a> on a pupil device: in 20 seconds it shows what works (camera, AI models, read-aloud, assistant).</>,
      "Privacy: camera images and inputs never leave the device. Only settings and progress are stored in the browser.",
      "Suggested flow (90 minutes): pre-test (5) · modules 1–4 (35) · break · modules 5–8 (30) · capstone with quiz (10) · post-test (10).",
      "The pre-test and post-test are built into the app (12 identical items, paper section V). At the end, pupils hand in their result file or result code via the learning report; the analysis above computes means, a t-test and the effect size."
    ],
    reset: "Reset progress on this device", resetDone: "Progress reset.",
    aiH: "AI assistant “Ask RecyBot” (modules 2, 4, 6, 7)",
    aiLead: "The assistant knows the game state and gives nudges without giving away solutions. With a language model connected it also answers free questions; otherwise it gives computed offline tips.",
    aiToggle: "Show the assistant for this class",
    aiSetup: "Connect a language model (optional):",
    aiSteps: [
      <>Create a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq</a> (no credit card).</>,
      <>In Netlify, under <b>Site configuration → Environment variables</b>, add: name <code>GROQ_API_KEY</code>, value = the key.</>,
      <>Publish the site via Git or the Netlify CLI (<code>npx netlify deploy --prod</code>). A plain drag-and-drop upload does not include the server function, so the assistant stays in offline mode.</>,
      "Privacy: only the question and the game state are sent, no name and no image. Groq does not retain requests by default. With minors, still mention it in the consent form. Don't use the free tiers of Gemini or Mistral: requests there may be used for training.",
      "Free limit: about 1,000 requests a day with the large model, after which the app switches automatically to a smaller one. That is plenty for a class."
    ]
  }
};

export default function Teacher({ settings, updateSettings, tm, labels, petIndex, resetProgress }) {
  const t = useText(TEXT);
  const { lang } = useLang();
  const [draft, setDraft] = useState(settings.modelUrl);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const link = shareLink(settings, lang);

  const load = () => {
    const u = normalizeUrl(draft);
    if (draft.trim() && !u) { setMsg(t.invalid); return; }
    setMsg(""); updateSettings({ modelUrl: u });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt(t.copy, link); }
  };

  let status;
  if (tm.status === "loading" || tm.status === "idle") status = ["info", t.loading];
  else if (tm.status === "error") status = ["warn", tm.error];
  else if (tm.model?.kind === "mobilenet") status = ["info", t.mn];
  else status = ["ok", t.ok(labels.length)];

  return (
    <section className="narrow teacher">
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <section className="card stack mt-lg">
        <h2 className="h-card">{t.s1}</h2>
        <ol className="howto">{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <p className="muted">{t.noModel}</p>
      </section>
      <section className="card stack">
        <h2 className="h-card">{t.s2}</h2>
        <label htmlFor="model">{t.modelLabel}</label>
        <input id="model" className="input" type="url" value={draft} onChange={e => setDraft(e.target.value)} placeholder="https://teachablemachine.withgoogle.com/models/…/" />
        {msg && <div className="status warn" role="alert">{msg}</div>}
        <div className="row">
          <button onClick={load}>{t.load}</button>
          {settings.modelUrl && <button className="secondary" onClick={() => { setDraft(""); updateSettings({ modelUrl: "" }); }}>{t.remove}</button>}
        </div>
        <div className={"status " + status[0]}>{status[1]}</div>
        {tm.status === "ready" && tm.model?.kind === "tm" && (
          <>
            <label htmlFor="pet">{t.petClass}</label>
            <select id="pet" className="input" value={labels[petIndex] || ""} onChange={e => updateSettings({ petLabel: e.target.value })}>
              {labels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </>
        )}
      </section>
      <section className="card stack">
        <h2 className="h-card">{t.s3}</h2>
        <p className="muted">{t.share}</p>
        <input className="input" type="url" readOnly value={link} onFocus={e => e.target.select()} aria-label={t.s3} />
        <div className="row"><button onClick={copy}>{copied ? t.copied + " ✓" : t.copy}</button></div>
      </section>
      <section className="card stack">
        <h2 className="h-card">{t.aiH}</h2>
        <p className="muted" style={{ margin: 0 }}>{t.aiLead}</p>
        <label className="toggle">
          <input type="checkbox" checked={settings.assistant !== false} onChange={e => updateSettings({ assistant: e.target.checked })} />
          {t.aiToggle}
        </label>
        <b>{t.aiSetup}</b>
        <ol className="howto">{t.aiSteps.map((x, i) => <li key={i}>{x}</li>)}</ol>
      </section>
      <ClassReport />
      <section className="card stack">
        <h2 className="h-card">{t.s4}</h2>
        <ul className="howto">{t.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        <div className="row"><button className="secondary" onClick={() => { resetProgress(); setMsg(t.resetDone); }}>{t.reset}</button></div>
      </section>
    </section>
  );
}
