import { useMemo, useState } from "react";
import { Tutor } from "../ai/TutorContext.jsx";
import { AiStatus, Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { JOULE_PER_FLOP, MATERIALS, MODEL_SPECS, REAL_SAMPLES, energyKJ, makeDataset, paramCount } from "../logic/nir.js";
import { trainNetwork } from "../ml/train.js";

const BUDGET = 20;  // kJ für alle Versuche zusammen
const GOAL = 90;    // Mindestgenauigkeit in %
const ORDER = ["mini", "medium", "huge"];

const TEXT = {
  de: {
    eyebrow: "Modul 8 · GreenAI Lab", title: "Wie viel Strom darf die Sortier-KI kosten?",
    lead: `Ein Nahinfrarot-Sensor misst, wie Kunststoffe Licht zurückwerfen. Ein neuronales Netz soll daraus PET, PP, PS und PVC erkennen. Du trainierst echte Netze direkt im Browser. Ziel: mindestens ${GOAL} % Genauigkeit, ohne das Energiebudget von ${BUDGET} kJ zu sprengen.`,
    budget: "Energiebudget", left: v => `${v} übrig`,
    m: { mini: ["Mini", "1 Schicht mit 4 Neuronen"], medium: ["Mittel", "2 Schichten mit je 16 Neuronen"], huge: ["Riesig", "3 Schichten mit je 128 Neuronen"] },
    params: n => `${n} Parameter`, perEpoch: v => `${v} pro Runde`,
    s1: "1 · Wie groß soll das Netz sein?", s2: "2 · Wie viele Trainingsrunden (Epochen)?", plan: (e) => `Geschätzter Energiebedarf: ${e}`,
    train: "Netz trainieren", training: (a, b) => `Training läuft: Runde ${a} von ${b}`, noBudget: "Nicht genug Energie übrig",
    curve: "Genauigkeit auf Testdaten, Runde für Runde", acc: "Genauigkeit",
    scale: "Energie-Waage", scaleGood: "Die Waage neigt sich zur Genauigkeit: gutes Verhältnis.", scaleBad: "Die Waage neigt sich zur Energie: viel Strom für wenig Gewinn.", scaleNone: "Noch kein Training.",
    apj: "Genauigkeit pro Kilojoule", best: (m, e, v) => `Bester Versuch über ${GOAL} %: ${m}, ${e} Runden, ${v} %/kJ`,
    measured: ms => `Im Browser gemessen: ${ms} ms Rechenzeit`,
    matrix: "Welche Kunststoffe verwechselt das Netz?", truth: "echt", pred: "erkannt",
    trainErr: "TensorFlow.js ließ sich nicht laden. Für dieses Modul braucht der Browser beim ersten Mal eine Internetverbindung.", runs: "Deine Versuche", reset: "Budget zurücksetzen", th: ["Netz", "Runden", "Genauigkeit", "Energie"],
    equiv: "Das entspricht etwa", laptop: "Laptop-Betrieb (30 W)",
    why: {
      start: [`Ziel: mindestens ${GOAL} %`, "Probier zuerst ein kleines Netz. Hochrechnen kannst du später immer noch."],
      mini: ["Warum reicht Mini nicht?", "Vier Neuronen sind zu wenig, um PET und PVC sicher auseinanderzuhalten. Die Spektren der beiden sind sich sehr ähnlich."],
      huge: e => ["Ziel erreicht, aber teuer", `Das große Netz ist kaum genauer als das mittlere, braucht aber rund ${e}-mal so viel Energie. Für eine Anlage, die täglich neu trainiert wird, ist das nicht vertretbar.`],
      hugeLow: ["Das große Netz frisst das Budget", "Jede Runde kostet viel Energie. Mehr Rechenaufwand bedeutet nicht automatisch ein besseres Ergebnis."],
      low: ["Noch nicht genau genug", "Mehr Runden helfen, aber nur bis zu einem Punkt. Danach steigt der Verbrauch, die Genauigkeit kaum noch."],
      good: (a, e) => ["Genau genug und sparsam", `${a} % Genauigkeit für ${e}. So sieht eine KI aus, die sich für den Dauerbetrieb lohnt.`]
    },
    merk: "Im Standardversuch (mittel mit 8 Runden, riesig mit 3 Runden) war das riesige Netz nur rund 1,5 Prozentpunkte genauer, brauchte aber fast 30-mal so viel Energie. Für eine Anlage, die jeden Tag neu trainiert, ist „genau genug und sparsam“ meist die bessere Wahl.",
    concept: [
      { h: "Was ein neuronales Netz lernt", p: "Das Netz bekommt 8 Messwerte (wie stark der Kunststoff in 8 Wellenbändern Licht zurückwirft) und gibt für jeden der 4 Kunststoffe eine Wahrscheinlichkeit aus. Dazwischen liegen Schichten aus Neuronen. Jede Verbindung hat ein Gewicht, einen Parameter. Beim Training werden diese Gewichte so lange angepasst, bis die Vorhersagen stimmen." },
      { h: "Epochen und Testdaten", p: "Eine Epoche ist ein Durchgang durch alle 800 Trainingsmessungen. Die Genauigkeit wird immer an 200 anderen Messungen geprüft, die das Netz nie zum Lernen bekommt. Sonst wüsste man nicht, ob es wirklich verstanden oder nur auswendig gelernt hat." },
      { h: "Wie die Energie geschätzt wird", p: <p>Training kostet pro Parameter und Messung etwa 6 Rechenoperationen (Vorwärts- und Rückwärtsrechnung). Wir rechnen hoch auf eine echte Anlage mit {(REAL_SAMPLES / 1e6).toLocaleString()} Mio. Trainingsmessungen und nehmen {JOULE_PER_FLOP.toExponential(0)} Joule pro Rechenoperation an (typischer Laptop-Prozessor). Die Zahlen sind eine Schätzung, aber das Verhältnis zwischen den Netzen stimmt: Das große Netz hat über 600-mal so viele Parameter wie das kleine.</p> },
      { h: "Green AI", p: "Schwartz et al. (2020) kritisieren, dass KI-Forschung fast nur auf Genauigkeit schaut. Strubell et al. (2019) haben berechnet, dass das Training großer Sprachmodelle so viel CO₂ verursachen kann wie mehrere Autos in ihrem ganzen Leben. Accuracy-per-Joule macht sichtbar, was Genauigkeit kostet." }
    ],
    terms: [["Parameter", "lernbare Zahl im Netz"], ["Epoche", "ein Durchgang durch alle Trainingsdaten"], ["Inferenz", "das fertige Netz benutzen (viel billiger als Training)"]]
  },
  en: {
    eyebrow: "Module 8 · GreenAI Lab", title: "How much power may the sorting AI use?",
    lead: `A near-infrared sensor measures how plastics reflect light. A neural network should tell PET, PP, PS and PVC apart from that. You train real networks right in your browser. Goal: at least ${GOAL} % accuracy without blowing the ${BUDGET} kJ energy budget.`,
    budget: "Energy budget", left: v => `${v} left`,
    m: { mini: ["Mini", "1 layer with 4 neurons"], medium: ["Medium", "2 layers with 16 neurons each"], huge: ["Huge", "3 layers with 128 neurons each"] },
    params: n => `${n} parameters`, perEpoch: v => `${v} per round`,
    s1: "1 · How big should the network be?", s2: "2 · How many training rounds (epochs)?", plan: (e) => `Estimated energy: ${e}`,
    train: "Train network", training: (a, b) => `Training: round ${a} of ${b}`, noBudget: "Not enough energy left",
    curve: "Accuracy on test data, round by round", acc: "Accuracy",
    scale: "Energy scale", scaleGood: "The scale tips towards accuracy: a good ratio.", scaleBad: "The scale tips towards energy: lots of power for little gain.", scaleNone: "No training yet.",
    apj: "Accuracy per kilojoule", best: (m, e, v) => `Best run above ${GOAL} %: ${m}, ${e} rounds, ${v} %/kJ`,
    measured: ms => `Measured in your browser: ${ms} ms of computing`,
    matrix: "Which plastics does the network mix up?", truth: "actual", pred: "predicted",
    trainErr: "TensorFlow.js could not be loaded. This module needs an internet connection the first time.", runs: "Your runs", reset: "Reset budget", th: ["Network", "Rounds", "Accuracy", "Energy"],
    equiv: "That is roughly", laptop: "running a laptop (30 W)",
    why: {
      start: [`Goal: at least ${GOAL} %`, "Try a small network first. You can always scale up later."],
      mini: ["Why isn't Mini enough?", "Four neurons are too few to reliably tell PET from PVC. Their spectra are very similar."],
      huge: e => ["Goal reached, but expensive", `The big network is barely more accurate than the medium one but needs about ${e} times as much energy. For a plant that retrains every day, that is not justifiable.`],
      hugeLow: ["The big network eats the budget", "Every round costs a lot of energy. More computation does not automatically mean a better result."],
      low: ["Not accurate enough yet", "More rounds help, but only up to a point. After that, consumption keeps rising while accuracy barely moves."],
      good: (a, e) => ["Accurate enough and frugal", `${a} % accuracy for ${e}. That is what an AI worth running every day looks like.`]
    },
    merk: "In the standard run (medium with 8 rounds, huge with 3 rounds) the huge network was only about 1.5 percentage points more accurate but needed almost 30 times the energy. For a plant that retrains every day, “accurate enough and frugal” is usually the better choice.",
    concept: [
      { h: "What a neural network learns", p: "The network gets 8 readings (how strongly the plastic reflects light in 8 wavebands) and outputs a probability for each of the 4 plastics. In between are layers of neurons. Every connection has a weight, a parameter. Training adjusts these weights until the predictions are right." },
      { h: "Epochs and test data", p: "One epoch is one pass through all 800 training readings. Accuracy is always checked on 200 other readings the network never learns from. Otherwise you could not tell whether it understood or just memorised." },
      { h: "How the energy is estimated", p: <p>Training costs about 6 operations per parameter and reading (forward and backward pass). We scale this up to a real plant with {(REAL_SAMPLES / 1e6).toLocaleString("en-GB")} million training readings and assume {JOULE_PER_FLOP.toExponential(0)} joules per operation (a typical laptop processor). The numbers are an estimate, but the ratio between the networks is right: the big network has more than 600 times as many parameters as the small one.</p> },
      { h: "Green AI", p: "Schwartz et al. (2020) criticise that AI research looks almost only at accuracy. Strubell et al. (2019) calculated that training large language models can cause as much CO₂ as several cars over their whole lifetime. Accuracy per joule shows what accuracy costs." }
    ],
    terms: [["Parameter", "a learnable number in the network"], ["Epoch", "one pass through all training data"], ["Inference", "using the finished network (much cheaper than training)"]]
  }
};

function Scale({ acc, energy, num }) {
  const left = acc ? (acc - 50) / 45 : 0;
  const right = Math.min(1, Math.log10(1 + energy * 10) / Math.log10(1 + 400));
  const angle = acc ? Math.max(-14, Math.min(14, (right - left) * 22)) : 0;
  return (
    <svg viewBox="0 0 420 290" width="100%" style={{ maxWidth: 420 }} aria-hidden="true">
      <polygon points="200,270 220,270 214,110 206,110" fill="#142019" /><rect x="150" y="268" width="120" height="14" rx="7" fill="#142019" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "210px 110px", transition: "transform .6s" }}>
        <rect x="50" y="104" width="320" height="10" rx="5" fill="#142019" />
        <line x1="70" y1="114" x2="70" y2="170" stroke="#142019" strokeWidth="3" /><line x1="350" y1="114" x2="350" y2="170" stroke="#142019" strokeWidth="3" />
        <path d="M20 170 H120 Q110 210 70 210 Q30 210 20 170 Z" fill="#DCEFE4" stroke="#1E6B4E" strokeWidth="3" />
        <path d="M300 170 H400 Q390 210 350 210 Q310 210 300 170 Z" fill="#FDE7D6" stroke="#C2410C" strokeWidth="3" />
        <text x="70" y="160" textAnchor="middle" fontSize="22" fontWeight="700" fill="#14532D">{acc ? num(acc, 1) + " %" : "–"}</text>
        <text x="350" y="160" textAnchor="middle" fontSize="20" fontWeight="700" fill="#9A3412">{acc ? fmtE(energy, num) : "–"}</text>
      </g>
      <circle cx="210" cy="110" r="10" fill="#7FD1A8" stroke="#142019" strokeWidth="3" />
    </svg>
  );
}
const fmtE = (kj, num) => (kj < 1 ? `${num(kj * 1000)} J` : `${num(kj, kj < 10 ? 1 : 0)} kJ`);

function Curve({ points, label }) {
  const W = 360, H = 140, x0 = 30, y0 = 115;
  if (!points.length) return null;
  const n = Math.max(points[points.length - 1].epoch, 5);
  const X = e => x0 + (e / n) * (W - x0 - 10), Y = a => y0 - ((a - 0.25) / 0.75) * 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      <line x1={x0} y1={y0} x2={W - 10} y2={y0} stroke="#D3DCD3" /><line x1={x0} y1={10} x2={x0} y2={y0} stroke="#D3DCD3" />
      <line x1={x0} y1={Y(GOAL / 100)} x2={W - 10} y2={Y(GOAL / 100)} stroke="#1E6B4E" strokeDasharray="5 4" />
      <text x={W - 12} y={Y(GOAL / 100) - 4} textAnchor="end" fontSize="10" fill="#1E6B4E">{GOAL} %</text>
      {[50, 100].map(v => <text key={v} x={x0 - 4} y={Y(v / 100) + 4} textAnchor="end" fontSize="10" fill="#4A5A50">{v}</text>)}
      <polyline points={points.map(p => `${X(p.epoch)},${Y(p.acc)}`).join(" ")} fill="none" stroke="#142019" strokeWidth="2.5" />
      {points.map(p => <circle key={p.epoch} cx={X(p.epoch)} cy={Y(p.acc)} r="2.5" fill="#142019" />)}
    </svg>
  );
}

export default function GreenAILab({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const data = useMemo(() => makeDataset(), []);
  const [modelId, setModelId] = useState("medium");
  const [epochs, setEpochs] = useState(8);
  const [used, setUsed] = useState(0);
  const [runs, setRuns] = useState([]);
  const [live, setLive] = useState(null); // {epoch, curve:[]}
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");

  const hidden = MODEL_SPECS[modelId].hidden;
  const params = paramCount(hidden);
  const plan = energyKJ(params, epochs);
  const left = BUDGET - used;
  const last = runs[runs.length - 1];
  const best = runs.filter(r => r.acc >= GOAL).sort((a, b) => b.apj - a.apj)[0];

  async function train() {
    if (plan > left || live) return;
    setError(""); setStatus("loading");
    const curve = [];
    setLive({ epoch: 0, curve });
    try {
      const res = await trainNetwork(hidden, data, epochs, (epoch, logs) => {
        curve.push({ epoch, acc: logs.acc });
        setStatus("ready");
        setLive({ epoch, curve: [...curve] });
      });
      const acc = +(res.accuracy * 100).toFixed(1);
      const run = { model: modelId, epochs, acc, energy: plan, apj: acc / plan, ms: Math.round(res.ms), confusion: res.confusion, curve: res.curve.map(c => ({ epoch: c.epoch, acc: c.acc })) };
      setUsed(u => u + plan);
      const all = [...runs, run];
      setRuns(all);
      const ok = all.filter(r => r.acc >= GOAL).sort((a, b) => b.apj - a.apj)[0];
      if (ok) report({ acc: ok.acc, energy: ok.energy, apj: +ok.apj.toFixed(2), model: ok.model });
    } catch (e) {
      console.error(e); setStatus("error"); setError(e.message || String(e));
    } finally { setLive(null); }
  }

  const medium = runs.find(r => r.model === "medium" && r.acc >= GOAL);
  let tone, wt, wx;
  if (!last) [tone, [wt, wx]] = ["info", t.why.start];
  else if (last.acc < GOAL && last.model === "mini") [tone, [wt, wx]] = ["warn", t.why.mini];
  else if (last.acc < GOAL && last.model === "huge") [tone, [wt, wx]] = ["warn", t.why.hugeLow];
  else if (last.acc < GOAL) [tone, [wt, wx]] = ["warn", t.why.low];
  else if (last.model === "huge") [tone, [wt, wx]] = ["warn", t.why.huge(num(medium ? last.energy / medium.energy : paramCount(MODEL_SPECS.huge.hidden) / paramCount(MODEL_SPECS.medium.hidden)))];
  else [tone, [wt, wx]] = ["ok", t.why.good(num(last.acc, 1), fmtE(last.energy, num))];

  const shown = live ? live.curve : last?.curve || [];

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <div className="budget">
          <div className="row between"><span>{t.budget}</span><b>{t.left(fmtE(Math.max(0, left), num))}</b></div>
          <div className="track big"><div className="fill" style={{ width: Math.max(0, (left / BUDGET) * 100) + "%", background: left < BUDGET * 0.2 ? "#C2410C" : "#1E6B4E" }} /></div>
        </div>
      </ModuleIntro>

      <div className="split3">
        <section className="stack">
          <div className="card">
            <b>{t.s1}</b>
            <div className="stack-s mt" role="radiogroup">
              {ORDER.map(id => (
                <button key={id} role="radio" aria-checked={modelId === id} className={"opt row-opt" + (modelId === id ? " on" : "")} onClick={() => setModelId(id)} disabled={!!live}>
                  <span><b>{t.m[id][0]}</b><small>{t.m[id][1]}</small></span>
                  <small>{t.params(num(paramCount(MODEL_SPECS[id].hidden)))}<br />{t.perEpoch(fmtE(energyKJ(paramCount(MODEL_SPECS[id].hidden), 1), num))}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="row between"><label htmlFor="ep"><b>{t.s2}</b></label><b>{epochs}</b></div>
            <input id="ep" type="range" min="1" max="40" value={epochs} onChange={e => setEpochs(+e.target.value)} disabled={!!live} />
            <div className="muted">{t.plan(fmtE(plan, num))}</div>
          </div>
          <button className="wide" onClick={train} disabled={!!live || plan > left}>
            {live ? t.training(live.epoch, epochs) : plan > left ? t.noBudget : t.train}
          </button>
          <AiStatus status={status} error={error && t.trainErr} />
        </section>

        <section className="stack">
          <div className="card center">
            <div style={{ alignSelf: "flex-start" }}><b>{t.scale}</b></div>
            <Scale acc={last?.acc} energy={last?.energy || 0} num={num} />
            <div className="muted" style={{ textAlign: "center" }}>{!last ? t.scaleNone : last.apj >= 50 ? t.scaleGood : t.scaleBad}</div>
          </div>
          {shown.length > 0 && (
            <div className="card">
              <b>{t.curve}</b>
              <Curve points={shown} label={t.curve} />
              {last && !live && <div className="muted">{t.measured(num(last.ms))}</div>}
            </div>
          )}
          {last && !live && (
            <div className="card">
              <b>{t.matrix}</b>
              <table className="tbl cm mt-s">
                <thead><tr><th>{t.truth} ↓ / {t.pred} →</th>{MATERIALS.map(m => <th key={m}>{m}</th>)}</tr></thead>
                <tbody>{last.confusion.map((row, i) => (
                  <tr key={i}><th>{MATERIALS[i]}</th>{row.map((v, j) => <td key={j} className={i === j ? "diag" : v > 3 ? "hot" : ""}>{v}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="stack">
          <section className="merk">
            <div className="eyebrow">{t.apj}</div>
            <div className="big-num light">{last ? num(last.apj, last.apj < 10 ? 1 : 0) + " %/kJ" : "–"}</div>
            {best && <div className="muted light">{t.best(t.m[best.model][0], best.epochs, num(best.apj, best.apj < 10 ? 1 : 0))}</div>}
          </section>
          <Why tone={tone} title={wt}>{wx}</Why>
          {last && (
            <section className="card">
              <b>{t.equiv}</b>
              <div className="stack-s mt">
                <div className="row between"><span>{t.laptop}</span><b>{num((last.energy * 1000) / 30 / 60, 1)} min</b></div>
                <div className="row between"><span>CO₂</span><b>≈ {num((last.energy / 3600) * 380, 2)} g</b></div>
              </div>
            </section>
          )}
          {runs.length > 0 && (
            <section className="card">
              <div className="row between"><b>{t.runs}</b><button className="link" onClick={() => { setUsed(0); setRuns([]); }}>{t.reset}</button></div>
              <table className="tbl mt-s">
                <thead><tr>{t.th.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{runs.map((r, i) => <tr key={i}><td>{t.m[r.model][0]}</td><td>{r.epochs}</td><td className={r.acc >= GOAL ? "green strong" : ""}>{num(r.acc, 1)} %</td><td>{fmtE(r.energy, num)}</td></tr>)}</tbody>
              </table>
            </section>
          )}
        </aside>
      </div>
      <div className="stack mt-lg">
        <Tutor module="green" ctx={{
          model: modelId, params, epochs, plan, left, runs: runs.length, lastAcc: last ? last.acc : null,
          bestApj: best ? Math.round(best.apj * 10) / 10 : null
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
