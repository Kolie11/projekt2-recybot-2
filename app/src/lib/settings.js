import { CONFIG } from "../config.js";

// Alles, was im Browser gespeichert wird, läuft über diese Datei.
// Gespeicherte Daten sind nie vertrauenswürdig: Sie können alt, beschädigt oder manipuliert sein.
// Deshalb gibt es eine Versionsnummer und eine Prüfung beim Lesen.
const SCHEMA = 2;
const KEYS = { settings: "recybot_settings", progress: "recybot_progress", results: "recybot_results" };
const VIEWS = ["label", "line", "tycoon", "repair", "routes", "policy", "sprint", "green", "capstone"];

function read(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (!raw || typeof raw !== "object") return null;
    if (raw.__v !== SCHEMA) return null; // ältere Version: verwerfen statt falsch deuten
    return raw.data;
  } catch { return null; }
}
function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ __v: SCHEMA, data })); } catch { /* privater Modus, voll */ }
}
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

export function normalizeUrl(u) {
  u = (u || "").trim();
  if (!u) return "";
  if (!/^https:\/\//i.test(u)) return "";               // nur https-Modelle laden
  u = u.replace(/(model\.json|metadata\.json)$/i, "");
  return u.endsWith("/") ? u : u + "/";
}

/** Reihenfolge: Link-Parameter > gespeicherte Einstellung > config.js */
export function loadSettings() {
  const params = new URLSearchParams(window.location.search);
  const stored = read(KEYS.settings) || {};
  const s = {
    modelUrl: normalizeUrl(params.get("model") || stored.modelUrl || CONFIG.MODEL_URL),
    petLabel: String(params.get("pet") || stored.petLabel || CONFIG.PET_LABEL || "").slice(0, 60),
    // Lehrkraft kann den KI-Assistenten abschalten (auch per Link: ?assistant=off)
    assistant: params.get("assistant") === "off" ? false : stored.assistant !== false
  };
  if (params.get("model") || params.get("assistant")) write(KEYS.settings, s);
  return s;
}
export const saveSettings = s => write(KEYS.settings, s);

export function loadProgress() {
  const p = read(KEYS.progress);
  if (!isObj(p)) return {};
  return Object.fromEntries(VIEWS.filter(v => p[v] === true).map(v => [v, true]));
}
export const saveProgress = p => write(KEYS.progress, p);

export function loadResults() {
  const r = read(KEYS.results);
  if (!isObj(r)) return {};
  return Object.fromEntries(Object.entries(r).filter(([k, v]) => VIEWS.includes(k) && isObj(v)));
}
export const saveResults = r => write(KEYS.results, r);

export function shareLink({ modelUrl, petLabel, assistant }, lang) {
  const url = new URL(window.location.href);
  url.hash = ""; url.search = "";
  if (modelUrl) url.searchParams.set("model", modelUrl);
  if (petLabel) url.searchParams.set("pet", petLabel);
  if (lang) url.searchParams.set("lang", lang);
  if (assistant === false) url.searchParams.set("assistant", "off");
  return url.toString();
}

// ---- Studie: Codename, Vor-/Nachtest, Fragebogen ----
const STUDY_KEY = "recybot_study";
const answersOk = a => Array.isArray(a) && a.every(x => x === null || (Number.isInteger(x) && x >= 0 && x < 4));
export function cleanStudy(s) {
  if (!isObj(s)) return {};
  const out = {};
  if (typeof s.code === "string") out.code = s.code.trim().slice(0, 24);
  for (const k of ["pre", "post"]) {
    if (isObj(s[k]) && answersOk(s[k].answers)) out[k] = { answers: s[k].answers.slice(0, 40), at: Number(s[k].at) || 0 };
  }
  if (isObj(s.survey)) {
    out.survey = Object.fromEntries(Object.entries(s.survey)
      .filter(([k, v]) => /^[a-z]+\d$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 5));
  }
  if (typeof s.comment === "string") out.comment = s.comment.slice(0, 500);
  return out;
}
export const loadStudy = () => cleanStudy(read(STUDY_KEY));
export const saveStudy = s => write(STUDY_KEY, s);
