import { useMemo, useState } from "react";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { MODULES } from "../i18n/common.js";
import { scoreTest } from "../logic/assessment.js";
import { metricName, metricText } from "../lib/metricText.js";
import { buildRecord, downloadText, encodeRecord } from "../lib/record.js";
import { computeCity } from "../logic/city.js";
import CountUp from "../components/CountUp.jsx";

const TEXT = {
  de: {
    eyebrow: "Lernbericht", title: "Das hast du mit RecyBot geschafft",
    noCode: "ohne Codename", codeL: "Codename", setCode: "Codename festlegen",
    modules: n => `${n} von 9 Modulen`, tests: "Wissenstest",
    pre: "Vortest", post: "Nachtest", open: "offen", notPlayed: "noch nicht gespielt",
    city: "Deine Kreislaufstadt", circ: "Kreislaufquote", co2: "CO₂", sat: "Zufriedenheit",
    learned: "Was du mitnimmst",
    ideas: {
      label: "Deine Labels waren die Trainingsdaten: Was falsch beschriftet war, hat die KI falsch gelernt.",
      line: "Precision und Recall ziehen in entgegengesetzte Richtungen. Der Schwellwert ist eine Entscheidung von Menschen.",
      tycoon: "Gutes Design macht Produkte langlebig, reparierbar und recycelbar.",
      repair: "Ein Entscheidungsbaum stellt zuerst die Frage mit dem größten Informationsgewinn.",
      routes: "Bei sehr vielen möglichen Routen rechnet man mit Faustregeln (Heuristiken). Sie sind schnell, finden aber nicht immer die kürzeste Route.",
      policy: "Systeme reagieren verzögert, und Korrelation ist keine Kausalität.",
      sprint: "Einseitige Daten führen zu verzerrter KI (Bias).",
      green: "Ein riesiges Netz war kaum genauer als ein mittleres, brauchte aber ein Vielfaches an Energie.",
      capstone: "Eine Entscheidung wirkt in anderen Bereichen weiter, etwa Verbundmaterial bis in die Sortieranlage."
    },
    share: "Ergebnis an die Lehrkraft geben",
    shareText: "Lade die Ergebnisdatei herunter oder kopiere den Ergebnis-Code und gib ihn deiner Lehrkraft. Es werden nur dein Codename und deine Ergebnisse weitergegeben, keine Bilder.",
    download: "Ergebnisdatei herunterladen", copy: "Ergebnis-Code kopieren", copied: "Kopiert ✓", print: "Drucken / als PDF speichern",
    footer: "RecyBot 2.0 · Hochschule Ruhr West · Master's Project 2"
  },
  en: {
    eyebrow: "Learning report", title: "What you achieved with RecyBot",
    noCode: "no code name", codeL: "Code name", setCode: "Set code name",
    modules: n => `${n} of 9 modules`, tests: "Knowledge test",
    pre: "Pre-test", post: "Post-test", open: "open", notPlayed: "not played yet",
    city: "Your circular city", circ: "Circularity", co2: "CO₂", sat: "Satisfaction",
    learned: "What you take away",
    ideas: {
      label: "Your labels were the training data: whatever was labelled wrong, the AI learned wrong.",
      line: "Precision and recall pull in opposite directions. The threshold is a human decision.",
      tycoon: "Good design makes products durable, repairable and recyclable.",
      repair: "A decision tree asks the question with the highest information gain first.",
      routes: "With too many possible routes, you work with rules of thumb (heuristics). They are fast but do not always find the shortest route.",
      policy: "Systems react with a delay, and correlation is not causation.",
      sprint: "One-sided data lead to a biased AI.",
      green: "A huge network was barely more accurate than a medium one but used many times the energy.",
      capstone: "A decision carries over into other areas, for example composite material all the way to the sorting plant."
    },
    share: "Hand your result to your teacher",
    shareText: "Download the result file or copy the result code and give it to your teacher. Only your code name and your results are shared, no images.",
    download: "Download result file", copy: "Copy result code", copied: "Copied ✓", print: "Print / save as PDF",
    footer: "RecyBot 2.0 · Ruhr West University of Applied Sciences · Master's Project 2"
  }
};

export default function Report({ study, updateStudy, results, progress }) {
  const t = useText(TEXT);
  const { lang, locale, pick } = useLang();
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const done = MODULES.filter(m => progress[m.view]);
  const pre = useMemo(() => (study.pre ? scoreTest(study.pre.answers) : null), [study.pre]);
  const post = useMemo(() => (study.post ? scoreTest(study.post.answers) : null), [study.post]);
  const city = useMemo(() => computeCity(results), [results]);
  const anyPlayed = MODULES.some(m => m.n <= 8 && results[m.view]);
  const record = () => buildRecord({ study, results, progress, lang });
  const fileName = `RecyBot_${(study.code || "ohne-Code").replace(/[^\w-]/g, "")}_${new Date().toISOString().slice(0, 10)}.json`;

  const copy = async () => {
    const txt = encodeRecord(record());
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt(t.copy, txt); }
  };

  return (
    <section className="report">
      <article className="cert">
        <header className="cert-head">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1 className="h-page">{t.title}</h1>
          </div>
          <div className="cert-meta">
            <span className={"cert-code" + (study.code ? "" : " empty")}>{study.code || t.noCode}</span>
            <span className="muted">{new Date().toLocaleDateString(locale)}</span>
          </div>
        </header>

        {!study.code && (
          <div className="row no-print mt">
            <label htmlFor="report-code" className="sr-visible">{t.codeL}</label>
            <input id="report-code" className="input" style={{ maxWidth: 220 }} value={code} maxLength={24} autoComplete="off" onChange={e => setCode(e.target.value)} />
            <button className="secondary" disabled={code.trim().length < 2} onClick={() => updateStudy({ code: code.trim().toUpperCase() })}>{t.setCode}</button>
          </div>
        )}

        <div className="cert-kpis">
          <div><span>{t.modules(done.length)}</span><div className="track big"><div className="fill" style={{ width: (done.length / 9) * 100 + "%" }} /></div></div>
          <div><span>{t.tests}</span><b>{pre ? pre.pct + " %" : t.open} → {post ? post.pct + " %" : t.open}</b></div>
          <div><span>{t.circ}</span><b>{anyPlayed ? <CountUp value={city.circ} suffix=" %" /> : "–"}</b></div>
          <div><span>{t.sat}</span><b>{anyPlayed ? <CountUp value={city.sat} suffix=" %" /> : "–"}</b></div>
        </div>

        <ol className="cert-list">
          {MODULES.map(m => {
            const r = results[m.view];
            return (
              <li key={m.view} className={progress[m.view] ? "done" : ""}>
                <span className="cert-n">{String(m.n).padStart(2, "0")}</span>
                <div>
                  <b>{pick(m.title)}</b> <span className="muted">· {metricName(lang, m.view)}</span>
                  <div className="cert-val">{metricText(lang, m.view, r) || <span className="muted">{t.notPlayed}</span>}</div>
                  {progress[m.view] && <div className="cert-idea">{t.ideas[m.view]}</div>}
                </div>
              </li>
            );
          })}
        </ol>
        <footer className="cert-foot muted">{t.footer}</footer>
      </article>

      <section className="card stack no-print">
        <h2 className="h-card">{t.share}</h2>
        <p className="muted" style={{ margin: 0 }}>{t.shareText}</p>
        <div className="row">
          <button onClick={() => downloadText(fileName, JSON.stringify(record(), null, 2))}>{t.download}</button>
          <button className="secondary" onClick={copy}>{copied ? t.copied : t.copy}</button>
          <button className="secondary" onClick={() => window.print()}>{t.print}</button>
        </div>
      </section>
    </section>
  );
}
