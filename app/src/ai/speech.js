// Sprachausgabe mit der Web Speech API des Browsers: kostenlos, ohne Server, ohne Datenübertragung.
// Die Stimmen kommen vom Gerät. Sehr natürlich klingen die neuronalen Stimmen in Microsoft Edge
// („… Online (Natural)“), gut die „Google“-Stimmen in Chrome und die „Premium“-Stimmen auf Apple-Geräten.
// RecyBot wählt automatisch die beste verfügbare Stimme; die Lernenden können sie im Assistenten ändern.

export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const PREF_KEY = "recybot_voice_name";
let voices = [];
const listeners = new Set();
function loadVoices() {
  try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; }
}
if (speechSupported) {
  loadVoices();
  // Nur das Ereignis benachrichtigt die Zuhörer; listVoices() lädt still nach (keine Endlosschleife).
  window.speechSynthesis.addEventListener?.("voiceschanged", () => { loadVoices(); listeners.forEach(fn => fn(voices)); });
}
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Qualität einer Stimme: kleiner = natürlicher. */
export function voiceRank(v) {
  const n = v.name || "";
  let r = 5;
  if (/natural|neural/i.test(n)) r = 0;                       // Edge: Microsoft … Online (Natural)
  else if (/premium|enhanced|siri/i.test(n)) r = 1;           // Apple: hochwertige Stimmen
  else if (/google/i.test(n)) r = 2;                          // Chrome: Google Deutsch / UK English
  else if (/online/i.test(n)) r = 2;
  else if (!v.localService) r = 3;
  if (/espeak|compact|desktop|robot/i.test(n)) r += 4;        // eher mechanisch
  return r;
}
export const voiceQuality = v => (!v ? "none" : voiceRank(v) <= 1 ? "natural" : voiceRank(v) <= 3 ? "good" : "basic");

export function listVoices(lang) {
  if (!voices.length) loadVoices();
  const want = lang === "de" ? "de" : "en";
  const pref = want === "de" ? /de-DE/i : /en-(GB|US)/i;
  return voices.filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith(want))
    .sort((a, b) => (voiceRank(a) + (pref.test(a.lang) ? 0 : 0.5)) - (voiceRank(b) + (pref.test(b.lang) ? 0 : 0.5)));
}

const readPref = lang => { try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}")[lang] || null; } catch { return null; } };
export function setPreferredVoice(lang, name) {
  try { const all = JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); all[lang] = name; localStorage.setItem(PREF_KEY, JSON.stringify(all)); } catch { /* egal */ }
}

/** Gewählte Stimme oder die beste verfügbare. */
export function pickVoice(lang) {
  const list = listVoices(lang);
  const name = readPref(lang);
  return (name && list.find(v => v.name === name)) || list[0] || null;
}

// Satzweise sprechen: natürlichere Pausen und kein Abbruch langer Texte (Chrome-Fehler).
function sentences(text) {
  const clean = String(text).replace(/[„“”"«»]/g, "").replace(/\s*·\s*/g, ", ").replace(/\s+/g, " ").trim();
  return clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [clean];
}

let token = 0;
export function speak(text, lang, { onStart, onEnd } = {}) {
  if (!speechSupported || !text) { onEnd?.(); return; }
  stopSpeaking();
  const my = ++token;
  const parts = sentences(text);
  const voice = pickVoice(lang);
  let started = false;
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = voice?.lang || (lang === "de" ? "de-DE" : "en-GB");
    try { if (voice) u.voice = voice; } catch { /* Stimme nicht setzbar: Standardstimme */ }
    u.rate = voiceRank(voice || {}) <= 1 ? 1 : 0.95;  // einfache Stimmen etwas langsamer, klingt ruhiger
    u.pitch = 1;
    u.onstart = () => { if (!started && my === token) { started = true; onStart?.(); } };
    if (i === parts.length - 1) u.onend = u.onerror = () => { if (my === token) onEnd?.(); };
    window.speechSynthesis.speak(u);
  });
}
export function stopSpeaking() {
  if (!speechSupported) return;
  token++;
  try { window.speechSynthesis.cancel(); } catch { /* egal */ }
}
