// Kurzbeschreibung der In-Game-Metrik je Modul (Tabelle I im Paper).
// Wird im Lernbericht und in der Klassenauswertung verwendet.
const P = v => (v === undefined || v === null || !isFinite(v) ? "–" : Math.round(v));
const F = v => (v === undefined || v === null || !isFinite(v) ? "–" : Math.round(v * 100));

const TXT = {
  de: {
    metric: {
      label: "Label-Genauigkeit", line: "Precision / Recall", tycoon: "Balance-Score", repair: "Diagnosen",
      routes: "Umweg gegenüber Algorithmus", policy: "Zielerreichung", sprint: "Abweichung vom Goldstandard",
      green: "Genauigkeit pro Energie", capstone: "Transfer-Quiz"
    },
    label: r => `${F(r.acc)} % der Labels richtig · deine KI im Test: ${F(r.aiAcc)} %`,
    line: r => `Precision ${P(r.prec)} % · Recall ${P(r.rec)} %`,
    tycoon: r => `Score ${P(r.score)} von 100${r.badge ? " · Abzeichen erhalten" : ""}`,
    repair: r => `${P(r.solvedCount)} von 3 Handys gerettet · Ø ${P(r.questions)} Fragen${r.broken ? " · ein Gerät zu früh geöffnet" : ""}`,
    routes: r => `Route ${P(Math.max(0, r.overhead))} % länger als die beste (${P(r.stops)} Stopps)`,
    policy: r => `Recycling ${P(r.R)} % · Zufriedenheit ${P(r.S)} %${r.goals ? " · alle Ziele erreicht" : ""}`,
    sprint: r => `Abweichung ${P(r.dev)} % · Zuverlässigkeit Wald ${P(r.forest)} %${r.diversified ? " · Daten ergänzt" : ""}`,
    green: r => `${P(r.acc)} % Genauigkeit · ${P(r.apj)} % pro kJ`,
    capstone: r => `${P(r.quiz)} von 10 richtig · Kreislaufquote ${P(r.circ)} %`
  },
  en: {
    metric: {
      label: "Label accuracy", line: "Precision / recall", tycoon: "Balance score", repair: "Diagnoses",
      routes: "Detour vs. algorithm", policy: "Goals reached", sprint: "Deviation from gold standard",
      green: "Accuracy per energy", capstone: "Transfer quiz"
    },
    label: r => `${F(r.acc)} % of labels correct · your AI in the test: ${F(r.aiAcc)} %`,
    line: r => `Precision ${P(r.prec)} % · recall ${P(r.rec)} %`,
    tycoon: r => `Score ${P(r.score)} of 100${r.badge ? " · badge earned" : ""}`,
    repair: r => `${P(r.solvedCount)} of 3 phones saved · avg. ${P(r.questions)} questions${r.broken ? " · one device opened too early" : ""}`,
    routes: r => `Route ${P(Math.max(0, r.overhead))} % longer than the best (${P(r.stops)} stops)`,
    policy: r => `Recycling ${P(r.R)} % · satisfaction ${P(r.S)} %${r.goals ? " · all goals met" : ""}`,
    sprint: r => `Deviation ${P(r.dev)} % · forest reliability ${P(r.forest)} %${r.diversified ? " · data extended" : ""}`,
    green: r => `${P(r.acc)} % accuracy · ${P(r.apj)} % per kJ`,
    capstone: r => `${P(r.quiz)} of 10 correct · circularity ${P(r.circ)} %`
  }
};

export const metricName = (lang, view) => TXT[lang].metric[view];
export const metricText = (lang, view, r) => (r ? TXT[lang][view](r) : null);
