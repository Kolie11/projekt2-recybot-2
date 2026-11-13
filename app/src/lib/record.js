// Ergebnisdatei für die Lehrkraft: alles, was ein Gerät über eine Person weiß,
// unter einem selbst gewählten Codenamen. Keine Klarnamen, keine Bilder.
import { cleanStudy } from "./settings.js";
import { scoreTest, surveyScales } from "../logic/assessment.js";

const VIEWS = ["label", "line", "tycoon", "repair", "routes", "policy", "sprint", "green", "capstone"];
const PREFIX = "RB1.";

/** Nur einfache Werte übernehmen (Zahlen, Wahrheitswerte, kurze Texte). */
function flat(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (k === "at" || k === "choice") continue;
    if (typeof v === "number" && isFinite(v)) out[k] = Math.round(v * 1000) / 1000;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && v.length <= 24) out[k] = v;
  }
  return out;
}

export function buildRecord({ study, results, progress, lang }) {
  return {
    app: "recybot", v: 1, at: new Date().toISOString(), lang,
    code: study.code || "",
    pre: study.pre ? { answers: study.pre.answers, at: study.pre.at } : null,
    post: study.post ? { answers: study.post.answers, at: study.post.at } : null,
    survey: study.survey || null, comment: study.comment || "",
    progress: VIEWS.filter(v => progress[v]),
    modules: Object.fromEntries(VIEWS.filter(v => results[v]).map(v => [v, flat(results[v])]))
  };
}

const b64urlEncode = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlDecode = s => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
};

export const encodeRecord = rec => PREFIX + b64urlEncode(JSON.stringify(rec));

/** Liest eine Ergebnisdatei (JSON) oder einen Ergebnis-Code. Wirft bei ungültigen Daten. */
export function decodeRecord(text) {
  text = String(text || "").trim();
  const json = text.startsWith(PREFIX) ? b64urlDecode(text.slice(PREFIX.length)) : text;
  const raw = JSON.parse(json);
  if (!raw || raw.app !== "recybot") throw new Error("not a RecyBot record");
  const study = cleanStudy({ code: raw.code, pre: raw.pre, post: raw.post, survey: raw.survey, comment: raw.comment });
  const modules = {};
  for (const v of VIEWS) if (raw.modules && typeof raw.modules[v] === "object") modules[v] = flat(raw.modules[v]);
  return {
    code: study.code || "–", at: String(raw.at || ""), lang: raw.lang === "en" ? "en" : "de",
    pre: study.pre ? scoreTest(study.pre.answers) : null,
    post: study.post ? scoreTest(study.post.answers) : null,
    survey: study.survey ? surveyScales(study.survey) : null,
    comment: study.comment || "",
    progress: Array.isArray(raw.progress) ? raw.progress.filter(v => VIEWS.includes(v)) : [],
    modules
  };
}

/**
 * Datei speichern. Läuft die App als claude.ai-Artifact, wird der dortige Download-Dialog
 * genutzt (im eingebetteten Rahmen sind normale Downloads gesperrt), sonst ein normaler Link.
 */
export async function downloadText(filename, text, type = "application/json") {
  if (window.claude?.use) {
    try {
      const dl = await window.claude.use("downloads");
      if (dl) { await dl.save({ filename, data: text }); return; }
    } catch (e) { if (e?.code === "declined" || e?.code === "rate_limited") return; }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
