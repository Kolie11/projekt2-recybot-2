import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LangContext.jsx";
import { CONFIG } from "../config.js";
import { loadSettings } from "../lib/settings.js";
import { classifyQuestion, describeContext, moduleIntro, offlineReply } from "../ai/tutor.js";
import { listVoices, onVoicesChanged, pickVoice, setPreferredVoice, speak, speechSupported, stopSpeaking, voiceQuality } from "../ai/speech.js";
import { useTutorState } from "../ai/TutorContext.jsx";
import { Logo } from "./icons.jsx";

const TEXT = {
  de: {
    fab: "Frag RecyBot", title: "RecyBot", sub: "Dein KI-Lernbegleiter",
    chips: { intro: "Erklär mir das Modul", hint: "Gib mir einen Tipp", explain: "Erklär mein Ergebnis", concept: "Erklär den Begriff" },
    label: "Eigene Frage", ph: "z. B. Was soll ich als Nächstes tun?", send: "Fragen",
    thinking: "RecyBot denkt nach …", you: "Du", bot: "RecyBot",
    online: "KI-Modell", offline: "Offline-Tipps",
    privacy: "Mit KI-Modell werden deine Frage und dein Spielstand ohne Namen an den Server geschickt. Schreib keine persönlichen Daten hinein.",
    clear: "Verlauf löschen", tooLong: "Bitte kürzer fragen (höchstens 300 Zeichen).",
    voiceOn: "Vorlesen an", voiceOff: "Vorlesen aus", listen: "Vorlesen", stop: "Stopp", close: "Schließen",
    noVoice: "Dieser Browser kann nicht vorlesen.",
    voiceH: "Stimme", test: "Probe hören", sample: "Hallo, ich bin RecyBot. So klinge ich.",
    q: { natural: "natürlich", good: "gut", basic: "einfach" },
    tipBasic: "Auf diesem Gerät gibt es nur einfache Stimmen. Am natürlichsten klingt RecyBot in Microsoft Edge (Stimmen „Online (Natural)“) oder in Chrome (Google-Stimmen)."
  },
  en: {
    fab: "Ask RecyBot", title: "RecyBot", sub: "Your AI learning companion",
    chips: { intro: "Explain this module", hint: "Give me a hint", explain: "Explain my result", concept: "Explain the concept" },
    label: "Your own question", ph: "e.g. What should I do next?", send: "Ask",
    thinking: "RecyBot is thinking …", you: "You", bot: "RecyBot",
    online: "AI model", offline: "Offline tips",
    privacy: "With an AI model, your question and game state are sent to the server without your name. Don't type personal data.",
    clear: "Clear chat", tooLong: "Please keep it shorter (300 characters max).",
    voiceOn: "Read aloud on", voiceOff: "Read aloud off", listen: "Read aloud", stop: "Stop", close: "Close",
    noVoice: "This browser cannot read aloud.",
    voiceH: "Voice", test: "Play sample", sample: "Hi, I'm RecyBot. This is how I sound.",
    q: { natural: "natural", good: "good", basic: "basic" },
    tipBasic: "This device only has basic voices. RecyBot sounds most natural in Microsoft Edge (“Online (Natural)” voices) or in Chrome (Google voices)."
  }
};

const VOICE_KEY = "recybot_voice";
const readVoicePref = () => { try { return localStorage.getItem(VOICE_KEY) !== "off"; } catch { return true; } };
const writeVoicePref = on => { try { localStorage.setItem(VOICE_KEY, on ? "on" : "off"); } catch { /* egal */ } };

// Einmal pro Sitzung merken, ob ein Sprachmodell erreichbar ist.
let remote = "unknown"; // "unknown" | "online" | "offline"
async function askRemote(payload) {
  if (!CONFIG.ASSISTANT_URL) { remote = "offline"; return null; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(CONFIG.ASSISTANT_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.includes("json")) {
      if ([404, 405, 503].includes(r.status) || !ct.includes("json")) remote = "offline";
      return null;
    }
    const d = await r.json();
    if (d.text) { remote = "online"; return d.text; }
    return null;
  } catch { remote = "offline"; return null; }
  finally { clearTimeout(timer); }
}

const SpeakerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

/** Schwebender Assistent: unten rechts in jedem Modul, öffnet ein Seitenpanel. */
export default function AssistantDock({ module }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const tutor = useTutorState();
  const ctx = tutor && tutor.module === module ? tutor.ctx : null;
  const [open, setOpen] = useState(false);
  const [histories, setHistories] = useState({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [mode, setMode] = useState(remote);
  const [voice, setVoice] = useState(readVoicePref);
  const [speakingId, setSpeakingId] = useState(null);
  const [voiceList, setVoiceList] = useState(() => (speechSupported ? listVoices(lang) : []));
  const [voiceName, setVoiceName] = useState(() => pickVoice(lang)?.name || "");
  useEffect(() => {
    const upd = () => { setVoiceList(listVoices(lang)); setVoiceName(pickVoice(lang)?.name || ""); };
    upd();
    return onVoicesChanged(upd);
  }, [lang]);
  const current = voiceList.find(v => v.name === voiceName) || voiceList[0];
  const logRef = useRef(null), fabRef = useRef(null), panelRef = useRef(null), inputRef = useRef(null);
  const enabled = CONFIG.ASSISTANT_ENABLED !== false && loadSettings().assistant !== false;
  const msgs = histories[module] || [];
  const setMsgs = fn => setHistories(h => ({ ...h, [module]: fn(h[module] || []) }));

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length, busy, open]);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => { stopSpeaking(); setSpeakingId(null); setOpen(false); }, [module]);
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled || !module) return null;

  const say = (id, text) => {
    if (!speechSupported) return;
    if (speakingId === id) { stopSpeaking(); setSpeakingId(null); return; }
    speak(text, lang, { onStart: () => setSpeakingId(id), onEnd: () => setSpeakingId(s => (s === id ? null : s)) });
    setSpeakingId(id);
  };
  const addBot = (text, source) => {
    const id = "m" + Date.now() + Math.random().toString(36).slice(2, 5);
    setMsgs(m => [...m, { id, role: "assistant", content: text, source }]);
    if (voice) say(id, text);
  };

  const run = async (userText, intent) => {
    if (busy) return;
    setErr("");
    const history = [...msgs, { role: "user", content: userText }];
    setMsgs(() => history);
    if (intent === "intro") { addBot(moduleIntro(module, lang), "intro"); return; }
    setBusy(true);
    const local = offlineReply(module, intent, ctx, lang) || moduleIntro(module, lang);
    let text = null;
    if (remote !== "offline") {
      text = await askRemote({
        module, lang, facts: ctx ? describeContext(module, ctx, lang) : [], hint: ctx ? offlineReply(module, "hint", ctx, lang) : "",
        messages: history.slice(-8).map(m => ({ role: m.role, content: m.content }))
      });
    }
    setMode(remote);
    setBusy(false);
    addBot(text || local, text ? "online" : "offline");
  };

  const openPanel = () => {
    setOpen(true);
    if (!msgs.length) addBot(moduleIntro(module, lang), "intro");
    setTimeout(() => panelRef.current?.querySelector("h2")?.focus(), 30);
  };
  const close = () => { setOpen(false); stopSpeaking(); setSpeakingId(null); setTimeout(() => fabRef.current?.focus(), 30); };
  const toggleVoice = () => { const v = !voice; setVoice(v); writeVoicePref(v); if (!v) { stopSpeaking(); setSpeakingId(null); } };

  const submit = e => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (v.length > 300) { setErr(t.tooLong); return; }
    setQ(""); run(v, classifyQuestion(v));
  };

  return (
    <>
      {!open && (
        <button ref={fabRef} type="button" className="as-fab" onClick={openPanel} aria-haspopup="dialog">
          <Logo size={34} /><span>{t.fab}</span>
        </button>
      )}
      {open && (
        <section ref={panelRef} className="as-panel" role="dialog" aria-modal="false" aria-labelledby="as-title">
          <div className="as-head">
            <span className={"as-avatar" + (speakingId ? " speaking" : "")} aria-hidden="true"><Logo size={44} /><i /><i /><i /></span>
            <div className="as-title">
              <h2 id="as-title" tabIndex={-1}>{t.title}</h2>
              <small>{t.sub} · <span className={"as-mode " + (mode === "online" ? "on" : "off")}>{mode === "online" ? t.online : t.offline}</span></small>
            </div>
            {speechSupported && (
              <button type="button" className={"as-icon" + (voice ? " on" : "")} onClick={toggleVoice} aria-pressed={voice} title={voice ? t.voiceOn : t.voiceOff}>
                <SpeakerIcon /><span className="sr">{voice ? t.voiceOn : t.voiceOff}</span>
              </button>
            )}
            <button type="button" className="as-icon" onClick={close} aria-label={t.close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          {speechSupported && voice && voiceList.length > 0 && (
            <details className="as-voice">
              <summary>{t.voiceH}: <b>{current?.name.replace(/^Microsoft |^Google /, "").replace(/ - .*$/, "")}</b> <span className={"vq " + voiceQuality(current)}>{t.q[voiceQuality(current)]}</span></summary>
              <div className="row mt-s">
                <label htmlFor="as-voice-sel" className="sr">{t.voiceH}</label>
                <select id="as-voice-sel" className="input" value={current?.name || ""} onChange={e => { setPreferredVoice(lang, e.target.value); setVoiceName(e.target.value); }}>
                  {voiceList.map(v => <option key={v.name} value={v.name}>{v.name} ({t.q[voiceQuality(v)]})</option>)}
                </select>
                <button type="button" className="secondary" onClick={() => say("sample", t.sample)}>{t.test}</button>
              </div>
              {voiceQuality(voiceList[0]) === "basic" && <p className="muted mt-s">{t.tipBasic}</p>}
            </details>
          )}
          <div className="as-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
            {msgs.map((m, i) => (
              <div key={m.id || i} className={"as-msg " + (m.role === "user" ? "user" : "bot")}>
                <span className="sr">{m.role === "user" ? t.you : t.bot}: </span>
                <p>{m.content}</p>
                {m.role === "assistant" && speechSupported && (
                  <button type="button" className="as-say" onClick={() => say(m.id, m.content)} aria-pressed={speakingId === m.id}>
                    <SpeakerIcon /> {speakingId === m.id ? t.stop : t.listen}
                  </button>
                )}
              </div>
            ))}
            {busy && <div className="as-msg bot typing" role="status"><span className="dots3" aria-hidden="true"><i /><i /><i /></span><span className="sr">{t.thinking}</span></div>}
          </div>

          <div className="as-chips">
            {Object.entries(t.chips).map(([intent, label]) => (
              <button key={intent} type="button" className="chip" disabled={busy} onClick={() => run(label, intent)}>{label}</button>
            ))}
          </div>

          <form className="as-form" onSubmit={submit}>
            <label htmlFor="as-q" className="as-label">{t.label}</label>
            <input id="as-q" ref={inputRef} className="input" value={q} maxLength={400} placeholder={t.ph} autoComplete="off"
              onChange={e => { setQ(e.target.value); setErr(""); }} aria-invalid={!!err} aria-describedby={err ? "as-err" : undefined} />
            <button type="submit" disabled={busy || !q.trim()}>{t.send}</button>
          </form>
          {err && <div id="as-err" className="status warn" role="alert">{err}</div>}
          <div className="as-foot">
            <small className="muted">{mode === "offline" ? "" : t.privacy}</small>
            {msgs.length > 1 && <button type="button" className="link" onClick={() => { stopSpeaking(); setSpeakingId(null); setMsgs(() => []); }}>{t.clear}</button>}
          </div>
        </section>
      )}
    </>
  );
}
