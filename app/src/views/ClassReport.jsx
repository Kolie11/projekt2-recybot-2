import { useMemo, useRef, useState } from "react";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { MODULES } from "../i18n/common.js";
import { TEST_ITEMS } from "../logic/assessment.js";
import { effectLabel, mean, pairedTTest, sd } from "../logic/stats.js";
import { buildRecord, decodeRecord, downloadText, encodeRecord } from "../lib/record.js";
import { rng } from "../logic/rng.js";

const TEXT = {
  de: {
    h: "Klassenauswertung (Vor- und Nachtest)",
    lead: "Sammeln Sie die Ergebnisdateien oder Ergebnis-Codes der Klasse ein. Die Auswertung läuft vollständig in diesem Browser, es werden keine Daten hochgeladen.",
    files: "Ergebnisdateien wählen", paste: "Oder Ergebnis-Codes einfügen (einer pro Zeile)", add: "Codes hinzufügen",
    demo: "Beispieldaten zum Ausprobieren", clear: "Alles entfernen", csv: "Als CSV exportieren (Excel, SPSS, R)",
    loaded: n => `${n} Datensätze geladen`, bad: n => `${n} Eintrag/Einträge konnten nicht gelesen werden.`, dup: "Doppelte Codenamen: der neueste Datensatz zählt.",
    demoNote: "Achtung: Das sind erfundene Beispieldaten, keine echten Ergebnisse.",
    empty: "Noch keine Daten geladen.",
    kPre: "Vortest Ø", kPost: "Nachtest Ø", kGain: "Zuwachs Ø", kN: "Paare (vorher + nachher)",
    testH: "Lernzuwachs (t-Test für verbundene Stichproben)",
    testText: r => `t(${r.df}) = ${r.t.toFixed(2).replace(".", ",")}, p ${r.p < 0.001 ? "< 0,001" : "= " + r.p.toFixed(3).replace(".", ",")}, Cohen's d = ${r.d.toFixed(2).replace(".", ",")}`,
    eff: { none: "kein nennenswerter Effekt", small: "kleiner Effekt", medium: "mittlerer Effekt", large: "großer Effekt" },
    sig: p => (p < 0.05 ? "Der Zuwachs ist statistisch signifikant (p < 0,05)." : "Der Zuwachs ist nicht statistisch signifikant (p ≥ 0,05)."),
    few: "Für einen t-Test braucht es mindestens zwei Personen mit Vor- und Nachtest.",
    caveat: "Hinweis: Ohne Kontrollgruppe lässt sich der Zuwachs nicht allein auf RecyBot zurückführen (siehe Paper, Limitationen).",
    itemsH: "Aufgabenanalyse: Anteil richtig je Frage", pre: "vorher", post: "nachher",
    scalesH: "Fragebogen (1–5)", interest: "Interesse", usability: "Bedienbarkeit", load: "Anstrengung",
    modH: "Module: gespielt und Ø Ergebnis", played: "gespielt",
    tableH: "Einzelne Datensätze", code: "Code", modules: "Module", comment: "Kommentare der Klasse"
  },
  en: {
    h: "Class results (pre-test and post-test)",
    lead: "Collect the result files or result codes from the class. The analysis runs entirely in this browser; no data are uploaded.",
    files: "Choose result files", paste: "Or paste result codes (one per line)", add: "Add codes",
    demo: "Sample data to try it out", clear: "Remove all", csv: "Export as CSV (Excel, SPSS, R)",
    loaded: n => `${n} records loaded`, bad: n => `${n} entr${n === 1 ? "y" : "ies"} could not be read.`, dup: "Duplicate code names: the newest record counts.",
    demoNote: "Note: these are made-up sample data, not real results.",
    empty: "No data loaded yet.",
    kPre: "Pre-test avg.", kPost: "Post-test avg.", kGain: "Avg. gain", kN: "Pairs (pre + post)",
    testH: "Learning gain (paired-samples t-test)",
    testText: r => `t(${r.df}) = ${r.t.toFixed(2)}, p ${r.p < 0.001 ? "< .001" : "= " + r.p.toFixed(3)}, Cohen's d = ${r.d.toFixed(2)}`,
    eff: { none: "no notable effect", small: "small effect", medium: "medium effect", large: "large effect" },
    sig: p => (p < 0.05 ? "The gain is statistically significant (p < .05)." : "The gain is not statistically significant (p ≥ .05)."),
    few: "A t-test needs at least two people with both a pre-test and a post-test.",
    caveat: "Note: without a control group the gain cannot be attributed to RecyBot alone (see paper, limitations).",
    itemsH: "Item analysis: share correct per question", pre: "before", post: "after",
    scalesH: "Survey (1–5)", interest: "Interest", usability: "Usability", load: "Effort",
    modH: "Modules: played and average result", played: "played",
    tableH: "Individual records", code: "Code", modules: "Modules", comment: "Comments from the class"
  }
};

/** Hauptkennzahl je Modul in Prozent (für Durchschnitte). */
const MAIN = {
  label: m => m.acc * 100, line: m => m.prec, tycoon: m => m.score, repair: m => (m.solvedCount / 3) * 100,
  routes: m => m.overhead, policy: m => m.R, sprint: m => m.forest, green: m => m.acc, capstone: m => m.quiz * 10
};
const UNIT = { label: "%", line: "%", tycoon: "/100", repair: "%", routes: { de: "% Umweg", en: "% detour" }, policy: "%", sprint: "%", green: "%", capstone: "%" };

function makeDemo() {
  const r = rng(2026), names = ["MA14", "SE03", "AN22", "KL09", "BI17", "TO30", "LE05", "JU11", "SA28", "FE02", "MI19", "NO07", "EL25", "PA13", "RO21", "HA08", "LU16", "TI04", "CA27", "EM12", "DA31", "GI06"];
  return names.map((code, k) => {
    const ability = r();
    const ans = boost => TEST_ITEMS.map(it => (r() < 0.25 + ability * 0.35 + boost + (it.dim === "ai" ? 0.05 : 0) ? it.a : (r() < 0.3 ? null : (it.a + 1) % 4)));
    const results = {
      label: { acc: 0.6 + r() * 0.4, aiAcc: 0.55 + r() * 0.4 }, line: { prec: Math.round(70 + r() * 30), rec: Math.round(60 + r() * 40) },
      tycoon: { score: Math.round(50 + r() * 40), badge: r() > 0.4 }, repair: { solvedCount: Math.floor(r() * 4), questions: 3 + Math.floor(r() * 3) },
      routes: { overhead: Math.round(r() * 30), stops: 8 }, policy: { R: Math.round(50 + r() * 25), S: Math.round(45 + r() * 25) },
      sprint: { dev: Math.round(10 + r() * 30), forest: Math.round(50 + r() * 40), diversified: r() > 0.3 },
      green: { acc: 90 + Math.round(r() * 40) / 10, apj: Math.round(r() * 800) / 10 }, capstone: { quiz: 5 + Math.floor(r() * 6), circ: Math.round(40 + r() * 40) }
    };
    const played = k % 7 === 0 ? 7 : 9;
    const progress = Object.fromEntries(MODULES.slice(0, played).map(m => [m.view, true]));
    const study = {
      code, pre: { answers: ans(0), at: 1 }, post: k === 5 ? undefined : { answers: ans(0.22), at: 2 },
      survey: { int1: 3 + Math.round(r() * 2), int2: 3 + Math.round(r() * 2), int3: 2 + Math.round(r() * 3), use1: 3 + Math.round(r() * 2), load1: 1 + Math.round(r() * 3) },
      comment: ["", "", "Der Line Controller mit der Kamera!", "Dass die KI im Wald so schlecht war.", "Repair Lab", ""][k % 6]
    };
    return decodeRecord(encodeRecord(buildRecord({ study, results: Object.fromEntries(Object.entries(results).filter(([v]) => progress[v])), progress, lang: "de" })));
  });
}

const fmt = (v, d = 0) => (v === null || v === undefined || !isFinite(v) ? "–" : v.toFixed(d));

export default function ClassReport() {
  const t = useText(TEXT);
  const { lang, pick } = useLang();
  const [records, setRecords] = useState([]);
  const [paste, setPaste] = useState("");
  const [bad, setBad] = useState(0);
  const [dup, setDup] = useState(false);
  const [demo, setDemo] = useState(false);
  const fileRef = useRef(null);
  const f = (v, d = 0) => (lang === "de" ? fmt(v, d).replace(".", ",") : fmt(v, d));

  const merge = (incoming, base = records) => {
    const map = new Map(base.map(r => [r.code, r]));
    let d = false;
    for (const r of incoming) {
      if (map.has(r.code)) { d = true; if ((map.get(r.code).at || "") > (r.at || "")) continue; }
      map.set(r.code, r);
    }
    setDup(d);
    setRecords([...map.values()].sort((a, b) => a.code.localeCompare(b.code)));
  };
  const parseMany = texts => {
    const ok = []; let fail = 0;
    for (const txt of texts) { try { ok.push(decodeRecord(txt)); } catch { fail++; } }
    setBad(fail); merge(ok);
  };
  const onFiles = async e => {
    const files = [...(e.target.files || [])];
    parseMany(await Promise.all(files.map(f => f.text())));
    setDemo(false); e.target.value = "";
  };

  const s = useMemo(() => {
    const pairs = records.filter(r => r.pre && r.post);
    const test = pairTest(pairs);
    const items = TEST_ITEMS.map(it => ({
      it, pre: share(records.filter(r => r.pre).map(r => r.pre.items[it.id])), post: share(records.filter(r => r.post).map(r => r.post.items[it.id]))
    }));
    const scale = k => mean(records.map(r => r.survey?.[k]).filter(v => v !== null && v !== undefined));
    const mods = MODULES.map(m => {
      const vals = records.map(r => r.modules[m.view]).filter(Boolean).map(MAIN[m.view]).filter(v => isFinite(v));
      return { m, played: records.filter(r => r.progress.includes(m.view)).length, avg: mean(vals) };
    });
    return {
      pairs, test, items, mods,
      pre: mean(records.filter(r => r.pre).map(r => r.pre.pct)), post: mean(records.filter(r => r.post).map(r => r.post.pct)),
      preSd: sd(records.filter(r => r.pre).map(r => r.pre.pct)), postSd: sd(records.filter(r => r.post).map(r => r.post.pct)),
      scales: { interest: scale("interest"), usability: scale("usability"), load: scale("load") }
    };
  }, [records]);

  const exportCsv = () => {
    const cols = ["code", "lang", "pre_pct", "pre_ai", "pre_ce", "post_pct", "post_ai", "post_ce", "gain",
      ...TEST_ITEMS.flatMap(it => [`pre_${it.id}`, `post_${it.id}`]), "interest", "usability", "load", "modules_played",
      ...MODULES.map(m => `${m.view}_main`), "comment"];
    const rows = records.map(r => {
      const v = {
        code: r.code, lang: r.lang, pre_pct: r.pre?.pct, pre_ai: r.pre?.ai, pre_ce: r.pre?.ce, post_pct: r.post?.pct, post_ai: r.post?.ai, post_ce: r.post?.ce,
        gain: r.pre && r.post ? r.post.pct - r.pre.pct : "", interest: r.survey?.interest?.toFixed(2), usability: r.survey?.usability?.toFixed(2), load: r.survey?.load?.toFixed(2),
        modules_played: r.progress.length, comment: r.comment
      };
      TEST_ITEMS.forEach(it => { v[`pre_${it.id}`] = r.pre ? +r.pre.items[it.id] : ""; v[`post_${it.id}`] = r.post ? +r.post.items[it.id] : ""; });
      MODULES.forEach(m => { const x = r.modules[m.view]; v[`${m.view}_main`] = x ? fmt(MAIN[m.view](x), 1) : ""; });
      return cols.map(c => csvCell(v[c])).join(";");
    });
    downloadText(`RecyBot_Klasse_${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + [cols.join(";"), ...rows].join("\r\n"), "text/csv");
  };

  return (
    <section className="card stack">
      <h2 className="h-card">{t.h}</h2>
      <p className="muted" style={{ margin: 0 }}>{t.lead}</p>
      <div className="row">
        <input ref={fileRef} type="file" accept=".json,application/json" multiple onChange={onFiles} hidden />
        <button onClick={() => fileRef.current?.click()}>{t.files}</button>
        <button className="secondary" onClick={() => { setBad(0); setDemo(true); merge(makeDemo(), []); }}>{t.demo}</button>
        {records.length > 0 && <button className="secondary" onClick={exportCsv}>{t.csv}</button>}
        {records.length > 0 && <button className="link" onClick={() => { setRecords([]); setDemo(false); setBad(0); setDup(false); }}>{t.clear}</button>}
      </div>
      <label htmlFor="codes">{t.paste}</label>
      <textarea id="codes" className="input area mono" rows={3} value={paste} onChange={e => setPaste(e.target.value)} placeholder="RB1.eyJhcHAiOiJyZWN5Ym90Ii…" />
      <div className="row"><button className="secondary" disabled={!paste.trim()} onClick={() => { parseMany(paste.split(/\s+/).filter(Boolean)); setPaste(""); setDemo(false); }}>{t.add}</button></div>
      {demo && <div className="status warn" role="status">{t.demoNote}</div>}
      {bad > 0 && <div className="status warn" role="alert">{t.bad(bad)}</div>}
      {dup && <div className="status info">{t.dup}</div>}
      {!records.length ? <p className="muted">{t.empty}</p> : (
        <>
          <div className="status ok">{t.loaded(records.length)}</div>
          <div className="kpi-row">
            <div className="kpi"><div className="kpi-v">{f(s.pre)} %</div><div className="kpi-l">{t.kPre}</div><div className="kpi-s">SD {f(s.preSd, 1)}</div></div>
            <div className="kpi"><div className="kpi-v">{f(s.post)} %</div><div className="kpi-l">{t.kPost}</div><div className="kpi-s">SD {f(s.postSd, 1)}</div></div>
            <div className="kpi"><div className="kpi-v green">{s.test.n >= 2 ? (s.test.meanDiff >= 0 ? "+" : "") + f(s.test.meanDiff, 1) : "–"}</div><div className="kpi-l">{t.kGain}</div><div className="kpi-s">pp</div></div>
            <div className="kpi"><div className="kpi-v">{s.pairs.length}</div><div className="kpi-l">{t.kN}</div></div>
          </div>

          <div className="advice">
            <b>{t.testH}</b>
            {s.test.n >= 2 && isFinite(s.test.t) ? (
              <p style={{ margin: "6px 0 0" }}>{t.testText(s.test)} · {t.eff[effectLabel(s.test.d)]}. {t.sig(s.test.p)}</p>
            ) : <p style={{ margin: "6px 0 0" }}>{t.few}</p>}
            <p className="muted" style={{ margin: "6px 0 0" }}>{t.caveat}</p>
          </div>

          <h3 className="sub-h">{t.itemsH}</h3>
          <div className="item-chart">
            {s.items.map(({ it, pre, post }, k) => (
              <div key={it.id} className="ic-row" title={it[lang][0]}>
                <span className="ic-l">{k + 1}. <small>{it.dim === "ai" ? "KI" : "CE"}</small></span>
                <div className="ic-bars">
                  <div className="track"><div className="fill pre" style={{ width: (pre ?? 0) + "%" }} /></div>
                  <div className="track"><div className="fill" style={{ width: (post ?? 0) + "%" }} /></div>
                </div>
                <span className="ic-v">{f(pre)} → <b>{f(post)}</b></span>
              </div>
            ))}
            <div className="legend"><span><i style={{ background: "var(--pre)" }} />{t.pre}</span><span><i style={{ background: "var(--primary)" }} />{t.post}</span></div>
          </div>

          <div className="pair">
            <div>
              <h3 className="sub-h">{t.scalesH}</h3>
              {["interest", "usability", "load"].map(k => (
                <div key={k} className="barrow"><span>{t[k]}</span><div className="track"><div className="fill" style={{ width: ((s.scales[k] || 0) - 1) / 4 * 100 + "%" }} /></div><b>{f(s.scales[k], 1)}</b></div>
              ))}
            </div>
            <div>
              <h3 className="sub-h">{t.modH}</h3>
              <table className="tbl">
                <tbody>
                  {s.mods.map(({ m, played, avg }) => (
                    <tr key={m.view}><td>{m.n}. {pick(m.title)}</td><td>{played}/{records.length} {t.played}</td><td><b>{f(avg)}</b> {typeof UNIT[m.view] === "object" ? UNIT[m.view][lang] : UNIT[m.view]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="sub-h">{t.tableH}</h3>
          <div className="table-scroll">
            <table className="tbl">
              <thead><tr><th>{t.code}</th><th>{t.kPre.replace(" Ø", "").replace(" avg.", "")}</th><th>{t.kPost.replace(" Ø", "").replace(" avg.", "")}</th><th>Δ</th><th>{t.modules}</th><th>{t.interest}</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.code}>
                    <td><b>{r.code}</b></td><td>{r.pre ? r.pre.pct + " %" : "–"}</td><td>{r.post ? r.post.pct + " %" : "–"}</td>
                    <td className={r.pre && r.post ? (r.post.pct >= r.pre.pct ? "green" : "orange") : ""}>{r.pre && r.post ? (r.post.pct - r.pre.pct > 0 ? "+" : "") + (r.post.pct - r.pre.pct) : "–"}</td>
                    <td>{r.progress.length}/9</td><td>{f(r.survey?.interest, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.some(r => r.comment) && (
            <>
              <h3 className="sub-h">{t.comment}</h3>
              <ul className="tight">{records.filter(r => r.comment).map(r => <li key={r.code}>„{r.comment}“ <span className="muted">({r.code})</span></li>)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function pairTest(pairs) { return pairedTTest(pairs.map(r => r.pre.pct), pairs.map(r => r.post.pct)); }
function share(bools) { return bools.length ? (bools.filter(Boolean).length / bools.length) * 100 : null; }
function csvCell(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
