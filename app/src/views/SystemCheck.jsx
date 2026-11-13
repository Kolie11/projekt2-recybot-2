import { useState } from "react";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { ModuleIntro } from "../components/ui.jsx";
import { getMobileNet, getTf } from "../ml/models.js";
import { svgElementToCanvas } from "../ml/render.js";
import { speak, speechSupported, pickVoice, voiceQuality } from "../ai/speech.js";
import { CONFIG } from "../config.js";

const TEXT = {
  de: {
    eyebrow: "Technik-Check", title: "Läuft RecyBot auf diesem Gerät?",
    lead: "Prüft in etwa 20 Sekunden, was dieses Gerät und dieses Netzwerk können. Ideal vor der Unterrichtsstunde auf einem Schülergerät.",
    run: "Check starten", again: "Noch einmal prüfen", running: "Wird geprüft …",
    ok: "funktioniert", warn: "eingeschränkt", fail: "nicht verfügbar",
    items: {
      storage: ["Spielstand speichern", "Fortschritt geht beim Neuladen verloren. Alles andere funktioniert."],
      graphics: ["Grafik für KI-Training (WebGL)", "Training läuft langsamer über den Prozessor (Modul 8)."],
      tf: ["TensorFlow.js (KI im Browser)", "Modul 8 kann keine Netze trainieren."],
      render: ["Szenen für die KI zeichnen", "Module 1 und 7 können nicht trainieren."],
      mobilenet: ["Großes Bildmodell (MobileNet)", "Module 1, 2 und 7 nutzen einfache Bildmerkmale; in Modul 2 lernen die Schülerinnen und Schüler ihre eigene Mini-KI an."],
      camera: ["Kamera", "Statt Kamera: Fotos hochladen oder Beispieldaten nutzen."],
      voice: ["Vorlesen (Sprachausgabe)", "Der Assistent zeigt seine Antworten nur als Text."],
      assistant: ["KI-Assistent mit Sprachmodell", "Der Assistent gibt berechnete Offline-Tipps statt freier Antworten."]
    },
    detail: {
      webgl: "WebGL aktiv", cpu: "nur Prozessor", render: w => `Zeichenweg: ${w}`, frame: "eingebettete Vorschau: Kamera gesperrt",
      noCam: "keine Kamera-Schnittstelle", insecure: "nur über https", voices: n => `${n} passende Stimme(n)`, noVoices: "keine deutsche/englische Stimme",
      online: "Server antwortet", basicVoice: "klingt mechanisch, natürlicher in Edge oder Chrome", offline: "kein Server-Schlüssel oder keine Funktion", local: "lokal gespeichert", groq: p => `Anbieter: ${p}`
    },
    camTest: "Kamera jetzt testen", speakTest: "Probe hören", sample: "Hallo, ich bin RecyBot. Die Sprachausgabe funktioniert.",
    summary: (o, n) => `${o} von ${n} Funktionen voll verfügbar. Alle Module sind spielbar; Einschränkungen siehe unten.`
  },
  en: {
    eyebrow: "Tech check", title: "Does RecyBot run on this device?",
    lead: "Checks in about 20 seconds what this device and network can do. Ideal on a pupil device before the lesson.",
    run: "Start check", again: "Check again", running: "Checking …",
    ok: "works", warn: "limited", fail: "not available",
    items: {
      storage: ["Save progress", "Progress is lost on reload. Everything else works."],
      graphics: ["Graphics for AI training (WebGL)", "Training runs more slowly on the processor (module 8)."],
      tf: ["TensorFlow.js (AI in the browser)", "Module 8 cannot train networks."],
      render: ["Draw scenes for the AI", "Modules 1 and 7 cannot train."],
      mobilenet: ["Large image model (MobileNet)", "Modules 1, 2 and 7 use simple image features; in module 2 pupils train their own mini AI."],
      camera: ["Camera", "Instead of the camera: upload photos or use sample data."],
      voice: ["Read aloud (speech output)", "The assistant shows its answers as text only."],
      assistant: ["AI assistant with language model", "The assistant gives computed offline tips instead of free answers."]
    },
    detail: {
      webgl: "WebGL active", cpu: "processor only", render: w => `drawing method: ${w}`, frame: "embedded preview: camera blocked",
      noCam: "no camera interface", insecure: "https only", voices: n => `${n} matching voice(s)`, noVoices: "no German/English voice",
      online: "server responds", basicVoice: "sounds mechanical; more natural in Edge or Chrome", offline: "no server key or no function", local: "stored locally", groq: p => `provider: ${p}`
    },
    camTest: "Test camera now", speakTest: "Play sample", sample: "Hi, I'm RecyBot. Speech output works.",
    summary: (o, n) => `${o} of ${n} features fully available. All modules are playable; see limitations below.`
  }
};

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);

export default function SystemCheck() {
  const t = useText(TEXT);
  const { lang } = useLang();
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [camMsg, setCamMsg] = useState("");

  const run = async () => {
    setBusy(true); setRes(null);
    const r = {};
    try { localStorage.setItem("recybot_check", "1"); localStorage.removeItem("recybot_check"); r.storage = ["ok", t.detail.local]; } catch { r.storage = ["warn", ""]; }
    try {
      const tf = await withTimeout(getTf(), 30000);
      const backend = tf.getBackend();
      r.tf = ["ok", "TensorFlow.js " + (tf.version?.tfjs || "")];
      r.graphics = backend === "webgl" ? ["ok", t.detail.webgl] : ["warn", t.detail.cpu];
    } catch { r.tf = ["fail", ""]; r.graphics = ["fail", ""]; }
    try {
      const c = await svgElementToCanvas(<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#1A6B48" /></svg>, 20, 20);
      const px = c.getContext("2d").getImageData(10, 10, 1, 1).data;
      r.render = px[1] > 80 ? ["ok", ""] : ["fail", ""];
    } catch { r.render = ["fail", ""]; }
    try { await withTimeout(getMobileNet(), 25000); r.mobilenet = ["ok", ""]; } catch { r.mobilenet = ["warn", ""]; }
    const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
    r.camera = !navigator.mediaDevices?.getUserMedia ? ["warn", t.detail.noCam] : !window.isSecureContext ? ["warn", t.detail.insecure] : inFrame ? ["warn", t.detail.frame] : ["ok", ""];
    if (!speechSupported) r.voice = ["warn", ""];
    else { await new Promise(res => setTimeout(res, 300)); const v = pickVoice(lang); r.voice = !v ? ["warn", t.detail.noVoices] : voiceQuality(v) === "basic" ? ["warn", v.name + " · " + t.detail.basicVoice] : ["ok", v.name]; }
    try {
      const resp = await withTimeout(fetch(CONFIG.ASSISTANT_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ module: "line", lang, messages: [{ role: "user", content: "ping" }] }) }), 20000);
      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && ct.includes("json")) { const d = await resp.json(); r.assistant = ["ok", d.provider ? t.detail.groq(d.provider) : t.detail.online]; }
      else r.assistant = ["warn", t.detail.offline];
    } catch { r.assistant = ["warn", t.detail.offline]; }
    setRes(r); setBusy(false);
  };

  const testCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      s.getTracks().forEach(x => x.stop());
      setCamMsg("✓ " + t.ok); setRes(r => (r ? { ...r, camera: ["ok", ""] } : r));
    } catch (e) { setCamMsg(`${t.fail}: ${e.name}`); }
  };

  const keys = Object.keys(t.items);
  const okCount = res ? keys.filter(k => res[k]?.[0] === "ok").length : 0;

  return (
    <section className="narrow">
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <div className="card stack mt-lg">
        <div className="row">
          <button onClick={run} disabled={busy}>{busy ? t.running : res ? t.again : t.run}</button>
          {speechSupported && <button className="secondary" onClick={() => speak(t.sample, lang)}>{t.speakTest}</button>}
          <button className="secondary" onClick={testCam}>{t.camTest}</button>
          {camMsg && <span className="muted" role="status">{camMsg}</span>}
        </div>
        {busy && <div className="status info" role="status"><span className="spinner" aria-hidden="true" /> {t.running}</div>}
        {res && <div className="status ok" role="status">{t.summary(okCount, keys.length)}</div>}
        {res && (
          <ul className="checklist">
            {keys.map(k => {
              const [state, detail] = res[k] || ["fail", ""];
              return (
                <li key={k} className={state}>
                  <span className="ck-dot" aria-hidden="true" />
                  <div>
                    <b>{t.items[k][0]}</b> <span className={"ck-state " + state}>{t[state]}</span>
                    {detail && <span className="muted"> · {detail}</span>}
                    {state !== "ok" && <div className="muted">{t.items[k][1]}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
