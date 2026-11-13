import { useMemo, useState } from "react";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { accuracy, avgQuestions, buildTree, classify, entropy, infoGain, treeSize } from "../logic/id3.js";
import { COST, FAULTS, FEATURES, makeCases } from "../logic/repairData.js";
import { Tutor } from "../ai/TutorContext.jsx";

// Seed 14: Mit 12 Fällen erkennt der Baum 58 % der neuen Fälle, mit 48 Fällen 92 % (siehe Tests).
const ALL = makeCases(84, 14);
const POOL = ALL.slice(0, 48), TESTS = ALL.slice(48);
const FULL_TREE = buildTree(POOL, FEATURES, "fault");
const ROUNDS = 3;
const ROUND_CASES = ["dirtyPort", "software", "battery"].map(f => TESTS.find(c => c.fault === f && classify(FULL_TREE, c).label === f) || TESTS.find(c => c.fault === f));

const TEXT = {
  de: {
    eyebrow: "Modul 4 · Repair Lab", title: "Drei Handys, die nicht mehr laden",
    lead: "Finde die Ursache mit möglichst wenigen Fragen. Jede Frage kostet Zeit. Danach siehst du, wie ein Entscheidungsbaum vorgeht, der aus 48 echten Werkstattfällen gelernt hat.",
    device: (n, m) => `Handy ${n} von ${m}`, points: "Punkte", questions: "Fragen",
    q: { led: "Leuchtet die Ladeanzeige beim Einstecken?", otherCable: "Lädt es mit einem anderen Kabel?", lint: "Siehst du Fusseln oder Staub in der Buchse?",
      drainsFast: "Ist der Akku schnell wieder leer?", hot: "Wird das Handy beim Laden heiß?", afterUpdate: "Fing es nach einem Update an?",
      wet: "Ist das Handy nass geworden?", wobbly: "Wackelt der Stecker in der Buchse?" },
    qShort: { led: "Ladeanzeige", otherCable: "anderes Kabel", lint: "Fusseln", drainsFast: "Akku schnell leer", hot: "wird heiß", afterUpdate: "nach Update", wet: "nass geworden", wobbly: "Stecker wackelt" },
    f: { cable: "Ladekabel defekt", dirtyPort: "Buchse verschmutzt", brokenPort: "Buchse defekt", battery: "Akku verschlissen", software: "Softwarefehler", water: "Wasserschaden" },
    fix: { cable: "Neues Kabel kaufen.", dirtyPort: "Buchse vorsichtig mit einem Holzzahnstocher reinigen.", brokenPort: "Buchse in der Werkstatt tauschen lassen.", battery: "Akku tauschen lassen.", software: "Neustart, Update oder Zurücksetzen.", water: "Sofort ausschalten, trocknen lassen, Werkstatt." },
    yes: "Ja", no: "Nein", ask: "Frage stellen", asked: "Deine Fragen", none: "Noch keine Frage gestellt.",
    diagnose: "Diagnose stellen", which: "Was ist kaputt?",
    open: "Gehäuse aufhebeln", openHint: "Unumkehrbar. Wenn es nicht nötig war, ist das Handy danach Elektroschrott.",
    right: f => `Richtig: ${f}`, wrong: (g, f) => `Leider falsch. Du hast „${g}“ gesagt, es war „${f}“.`,
    broken: "Point of No Return: Display gebrochen, Akku beschädigt. Das Handy ist Elektroschrott.",
    cost: c => `Reparaturkosten: ca. ${c} €`,
    ai: "So hätte der Entscheidungsbaum gefragt", aiN: n => `${n} Fragen`, aiSays: f => `Baum: ${f}`,
    youVsAi: (y, a) => y < a ? `Du hast weniger Fragen gebraucht als der Baum (${y} gegen ${a}).` : y === a ? `Gleich viele Fragen wie der Baum (${y}).` : `Der Baum kam mit ${a} statt ${y} Fragen aus.`,
    next: "Nächstes Handy", summary: "Deine Bilanz", saved: (a, b) => `${a} von ${b} Handys gerettet`, again: "Nochmal spielen",
    learnTitle: "Wie der Entscheidungsbaum lernt", learnLead: "Der Baum bekommt Werkstattfälle mit Symptomen und der echten Ursache. Er rechnet aus, welche Frage die Fälle am besten ordnet, und stellt sie zuerst.",
    trainN: "Trainingsfälle", testAcc: "Treffer bei 36 neuen Fällen", avgQ: "Fragen im Schnitt", size: "Größe des Baums", leaves: n => `${n} Endpunkte`,
    gainTitle: "Informationsgewinn der ersten Frage", gainHint: "Je länger der Balken, desto mehr Ordnung bringt die Frage in die Fälle. Der Baum nimmt die längste.",
    entropy: v => `Unordnung am Anfang: ${v} Bit`,
    tree: "Der gelernte Baum", fewData: "Mit wenigen Fällen lernt der Baum Zufälle auswendig und liegt bei neuen Fällen öfter daneben.",
    whyOpen: ["Erst denken, dann schrauben", "Wer ohne Diagnose öffnet, riskiert ein Gerät, das sonst mit einem Kabel für 10 € gerettet wäre."],
    whyGood: ["Gute Diagnose", "Wenige gezielte Fragen sind besser als viele zufällige. Genau so arbeitet auch der Entscheidungsbaum."],
    whyWrong: ["Falsche Diagnose", "Schau dir an, welche Fragen der Baum gestellt hat. Oft trennt eine einzige Frage zwei Ursachen sauber voneinander."],
    whyStart: ["Fang mit einer Frage an, die viel ausschließt", "Die Ladeanzeige zum Beispiel trennt Probleme mit Strom von Problemen mit Akku oder Software."],
    merk: "Ein Entscheidungsbaum stellt immer die Frage, die am meisten Klarheit bringt. Man kann jeden Schritt nachvollziehen. Und: Erst diagnostizieren, dann eingreifen. Reparieren erhält viel mehr Wert als Recyceln.",
    concept: [
      { h: "Entscheidungsbäume", p: "Ein Entscheidungsbaum ist eine der ältesten Methoden des maschinellen Lernens (Quinlan, 1986). Er lernt aus Beispielen eine Folge von Ja/Nein-Fragen. Sein großer Vorteil: Man sieht genau, warum er zu einem Ergebnis kommt." },
      { h: "Entropie und Informationsgewinn", p: <p>Die Entropie misst, wie durcheinander die Fälle noch sind. Sechs gleich häufige Ursachen ergeben log₂(6) ≈ 2,58 Bit. Für jede mögliche Frage rechnet der Baum aus, wie stark die Entropie danach sinkt. Das ist der Informationsgewinn. Die Frage mit dem größten Gewinn kommt zuerst, dann geht es in jedem Zweig von vorn los.</p> },
      { h: "Zu wenige Daten: Auswendiglernen", p: "Mit nur 12 Fällen findet der Baum Muster, die zufällig sind. In RecyBot trifft er dann nur etwas mehr als die Hälfte der neuen Fälle, mit 48 Fällen über 90 %. Bei neuen Handys liegt er dann öfter falsch. Mit mehr Fällen werden die Regeln allgemeiner. Das nennt man Überanpassung (Overfitting)." },
      { h: "Reparieren vor Recyceln", p: "Stahel (2013) zeigt: Wer ein Produkt repariert, erhält Material, Energie und Arbeit, die darin stecken. Beim Recycling bleibt nur der Rohstoff. Der „Point of No Return“ macht spürbar, wie schnell dieser Wert verloren geht." }
    ],
    terms: [["Entropie", "Maß für Unordnung, in Bit"], ["Informationsgewinn", "wie viel Unordnung eine Frage beseitigt"], ["Overfitting", "Zufälle auswendig gelernt statt Regeln"]]
  },
  en: {
    eyebrow: "Module 4 · Repair Lab", title: "Three phones that won't charge",
    lead: "Find the cause with as few questions as possible. Every question costs time. Afterwards you see how a decision tree does it, after learning from 48 real repair-shop cases.",
    device: (n, m) => `Phone ${n} of ${m}`, points: "Points", questions: "Questions",
    q: { led: "Does the charging light come on when plugged in?", otherCable: "Does it charge with a different cable?", lint: "Can you see lint or dust in the port?",
      drainsFast: "Does the battery run down quickly?", hot: "Does the phone get hot while charging?", afterUpdate: "Did it start after an update?",
      wet: "Has the phone got wet?", wobbly: "Does the plug wobble in the port?" },
    qShort: { led: "charging light", otherCable: "other cable", lint: "lint", drainsFast: "battery drains", hot: "gets hot", afterUpdate: "after update", wet: "got wet", wobbly: "plug wobbles" },
    f: { cable: "Faulty cable", dirtyPort: "Dirty port", brokenPort: "Broken port", battery: "Worn-out battery", software: "Software fault", water: "Water damage" },
    fix: { cable: "Buy a new cable.", dirtyPort: "Carefully clean the port with a wooden toothpick.", brokenPort: "Have the port replaced in a repair shop.", battery: "Have the battery replaced.", software: "Restart, update or reset.", water: "Switch off at once, let it dry, take it to a shop." },
    yes: "Yes", no: "No", ask: "Ask", asked: "Your questions", none: "No questions asked yet.",
    diagnose: "Make a diagnosis", which: "What is broken?",
    open: "Pry the case open", openHint: "Irreversible. If it wasn't necessary, the phone is e-waste afterwards.",
    right: f => `Correct: ${f}`, wrong: (g, f) => `Not quite. You said “${g}”, it was “${f}”.`,
    broken: "Point of no return: display cracked, battery damaged. The phone is now e-waste.",
    cost: c => `Repair cost: about €${c}`,
    ai: "How the decision tree would have asked", aiN: n => `${n} questions`, aiSays: f => `Tree: ${f}`,
    youVsAi: (y, a) => y < a ? `You needed fewer questions than the tree (${y} vs ${a}).` : y === a ? `Same number of questions as the tree (${y}).` : `The tree managed with ${a} instead of ${y} questions.`,
    next: "Next phone", summary: "Your result", saved: (a, b) => `${a} of ${b} phones saved`, again: "Play again",
    learnTitle: "How the decision tree learns", learnLead: "The tree gets repair cases with symptoms and the real cause. It works out which question sorts the cases best and asks that one first.",
    trainN: "Training cases", testAcc: "Hits on 36 new cases", avgQ: "Questions on average", size: "Tree size", leaves: n => `${n} end points`,
    gainTitle: "Information gain of the first question", gainHint: "The longer the bar, the more order the question brings into the cases. The tree picks the longest.",
    entropy: v => `Disorder at the start: ${v} bits`,
    tree: "The learned tree", fewData: "With only a few cases the tree memorises coincidences and gets new cases wrong more often.",
    whyOpen: ["Think first, then use the screwdriver", "Opening without a diagnosis risks a device that could have been saved with a €10 cable."],
    whyGood: ["Good diagnosis", "A few targeted questions beat many random ones. That is exactly how the decision tree works too."],
    whyWrong: ["Wrong diagnosis", "Look at the questions the tree asked. Often a single question cleanly separates two causes."],
    whyStart: ["Start with a question that rules out a lot", "The charging light, for example, separates power problems from battery or software problems."],
    merk: "A decision tree always asks the question that brings the most clarity, and you can follow every step. Also: diagnose first, then act. Repairing keeps far more value than recycling.",
    concept: [
      { h: "Decision trees", p: "A decision tree is one of the oldest machine-learning methods (Quinlan, 1986). It learns a sequence of yes/no questions from examples. Its big advantage: you can see exactly why it reaches a result." },
      { h: "Entropy and information gain", p: <p>Entropy measures how mixed up the cases still are. Six equally common causes give log₂(6) ≈ 2.58 bits. For every possible question the tree calculates how much the entropy drops afterwards. That is the information gain. The question with the highest gain comes first, then the process repeats in each branch.</p> },
      { h: "Too little data: memorising", p: "With only 12 cases the tree finds patterns that are pure chance. In RecyBot it then gets only just over half of the new cases right; with 48 cases it is above 90 %. With more cases the rules become more general. This is called overfitting." },
      { h: "Repair before recycling", p: "Stahel (2013) shows that repairing a product keeps the material, energy and labour that went into it. Recycling only keeps the raw material. The point of no return makes you feel how quickly that value is lost." }
    ],
    terms: [["Entropy", "a measure of disorder, in bits"], ["Information gain", "how much disorder a question removes"], ["Overfitting", "memorising chance instead of rules"]]
  }
};

function TreeView({ node, t, depth = 0 }) {
  if (node.leaf) return <div className="tleaf"><b>{t.f[node.label]}</b> <span className="muted">({node.n})</span></div>;
  if (depth >= 4) return <div className="tleaf muted">…</div>;
  return (
    <div className="tnode">
      <div className="tq">{t.qShort[node.attr]}?</div>
      <div className="tbranches">
        <div><span className="tlabel yes">{t.yes}</span><TreeView node={node.yes} t={t} depth={depth + 1} /></div>
        <div><span className="tlabel no">{t.no}</span><TreeView node={node.no} t={t} depth={depth + 1} /></div>
      </div>
    </div>
  );
}

function Phone({ state }) {
  const fill = state === "broken" ? "#3F4A44" : state === "ok" ? "#DCEFE4" : "#E3E8E4";
  return (
    <svg width="110" height="180" viewBox="0 0 120 200" fill="none" aria-hidden="true">
      <rect x="10" y="6" width="100" height="188" rx="18" stroke="#142019" strokeWidth="4" />
      <rect x="20" y="24" width="80" height="140" rx="6" fill={fill} />
      {state === "broken" && <path d="M34 30 L58 72 L44 96 L76 140 M58 72 L88 60" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" />}
      {state === "ok" && <path d="M44 94 l12 12 l22 -24" stroke="#14532D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
      {state === "q" && <g><rect x="44" y="84" width="32" height="18" rx="4" stroke="#4A5A50" strokeWidth="3" /><line x1="80" y1="93" x2="86" y2="93" stroke="#4A5A50" strokeWidth="3" /></g>}
      <rect x="48" y="176" width="24" height="6" rx="3" fill="#142019" />
    </svg>
  );
}

export default function RepairLab({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const [round, setRound] = useState(0);
  const [asked, setAsked] = useState([]);
  const [outcome, setOutcome] = useState(null); // {type:"diag", guess} | {type:"broken"}
  const [log, setLog] = useState([]);
  const [trainN, setTrainN] = useState(48);

  const tree = useMemo(() => buildTree(POOL.slice(0, trainN), FEATURES, "fault"), [trainN]);
  const stats = useMemo(() => ({ acc: accuracy(tree, TESTS, "fault"), q: avgQuestions(tree, TESTS), size: treeSize(tree) }), [tree]);
  const gains = useMemo(() => FEATURES.map(f => ({ f, g: infoGain(POOL.slice(0, trainN), f, "fault") })).sort((a, b) => b.g - a.g), [trainN]);
  const h0 = entropy(POOL.slice(0, trainN), "fault");

  const finished = log.length >= ROUNDS;
  const kase = ROUND_CASES[Math.min(round, ROUNDS - 1)];
  const points = Math.max(0, 100 - asked.length * 10 - (outcome?.type === "broken" ? 60 : 0) - (outcome?.type === "diag" && outcome.guess !== kase.fault ? 30 : 0));
  const aiPath = classify(FULL_TREE, kase);

  const ask = f => { if (!outcome && !asked.includes(f)) setAsked(a => [...a, f]); };
  const finish = o => {
    setOutcome(o);
    const entry = { solved: o.type === "diag" && o.guess === kase.fault, broken: o.type === "broken", questions: asked.length, ai: aiPath.path.length };
    const nextLog = [...log, entry];
    setLog(nextLog);
    if (nextLog.length >= ROUNDS) {
      const solved = nextLog.filter(e => e.solved).length;
      report({ solved: solved >= 2, solvedCount: solved, broken: nextLog.some(e => e.broken), questions: Math.round(nextLog.reduce((a, e) => a + e.questions, 0) / nextLog.length) });
    }
  };
  const next = () => { setRound(r => r + 1); setAsked([]); setOutcome(null); };
  const restart = () => { setRound(0); setAsked([]); setOutcome(null); setLog([]); };

  // Kontext für den Assistenten: Welche Werkstattfälle passen noch, welche Frage trennt sie am besten?
  const tutorCtx = useMemo(() => {
    const rows = POOL.filter(r => asked.every(f => r[f] === kase[f]));
    const base = rows.length ? rows : POOL;
    const open = FEATURES.filter(f => !asked.includes(f));
    const best = open.map(f => ({ f, g: infoGain(base, f, "fault") })).sort((a, b) => b.g - a.g)[0];
    const counts = {}; for (const r of rows) counts[r.fault] = (counts[r.fault] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    return {
      round, rounds: ROUNDS, nLeft: rows.length,
      asked: asked.map(f => ({ q: t.q[f], a: kase[f] ? t.yes : t.no })),
      best: best && best.g > 0.01 ? t.q[best.f] : null,
      confident: rows.length > 0 && top / rows.length >= 0.85,
      outcome: !outcome ? null : outcome.type === "broken" ? "broken" : outcome.guess === kase.fault ? "ok" : "wrong"
    };
  }, [asked, kase, outcome, round, t]);

  const state = outcome?.type === "broken" ? "broken" : outcome?.type === "diag" && outcome.guess === kase.fault ? "ok" : "q";
  const [tone, [wt, wx]] = !outcome ? ["info", t.whyStart] : outcome.type === "broken" ? ["warn", t.whyOpen] : outcome.guess === kase.fault ? ["ok", t.whyGood] : ["warn", t.whyWrong];

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        {!finished && <div className="pill-kpi"><span>{t.device(round + 1, ROUNDS)}</span><b>{points} {t.points}</b></div>}
      </ModuleIntro>

      <div className="split">
        <div className="side stack">
          <section className="card center">
            <Phone state={state} />
            <div className="row" style={{ gap: 24 }}>
              <div className="kpi"><div className="kpi-v">{points}</div><div className="kpi-l">{t.points}</div></div>
              <div className="kpi"><div className="kpi-v">{asked.length}</div><div className="kpi-l">{t.questions}</div></div>
            </div>
          </section>
          <section className="card">
            <b>{t.asked}</b>
            {!asked.length && <div className="muted mt-s">{t.none}</div>}
            {asked.map((f, i) => (
              <div className="pathstep" key={f}><div className="num sm">{i + 1}</div><div>{t.q[f]}<br /><b className="green">→ {kase[f] ? t.yes : t.no}</b></div></div>
            ))}
          </section>
          {!outcome && (
            <div className="risk">
              <div><b className="orange">{t.open}</b><div className="muted">{t.openHint}</div></div>
              <button onClick={() => finish({ type: "broken" })}>{t.open}</button>
            </div>
          )}
        </div>

        <div className="main stack">
          {!outcome ? (
            <>
              <section className="card">
                <b>{t.ask}</b>
                <div className="qgrid mt">
                  {FEATURES.map(f => (
                    <button key={f} className={"opt qopt" + (asked.includes(f) ? " on" : "")} disabled={asked.includes(f)} onClick={() => ask(f)}>
                      <span>{t.q[f]}</span>{asked.includes(f) && <b>{kase[f] ? t.yes : t.no}</b>}
                    </button>
                  ))}
                </div>
              </section>
              <section className="card">
                <b>{t.which}</b>
                <div className="grid3 mt">
                  {FAULTS.map(f => <button key={f} className="opt" onClick={() => finish({ type: "diag", guess: f })}>{t.f[f]}</button>)}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className={"res " + (state === "ok" ? "good" : "bad")}>
                <div className="eyebrow">{t.device(round + 1, ROUNDS)}</div>
                <h2>{outcome.type === "broken" ? t.broken : outcome.guess === kase.fault ? t.right(t.f[kase.fault]) : t.wrong(t.f[outcome.guess], t.f[kase.fault])}</h2>
                {outcome.type === "diag" && <p>{t.fix[kase.fault]} <span className="pill">{t.cost(COST[kase.fault])}</span></p>}
              </div>
              <section className="card">
                <div className="row between"><b>{t.ai}</b><span className="muted">{t.aiN(aiPath.path.length)}</span></div>
                <div className="stack-s mt">
                  {aiPath.path.map((p, i) => <div className="pathstep" key={i}><div className="num sm ai">{i + 1}</div><div>{t.q[p.attr]}<br /><b>→ {p.answer ? t.yes : t.no}</b></div></div>)}
                  <div className="strong">{t.aiSays(t.f[aiPath.label])}</div>
                </div>
                {outcome.type === "diag" && outcome.guess === kase.fault && <p className="muted mt-s">{t.youVsAi(asked.length, aiPath.path.length)}</p>}
              </section>
              <Why tone={tone} title={wt}>{wx}</Why>
              {!finished ? <button className="wide" onClick={next}>{t.next}</button> : (
                <div className={"res " + (log.filter(e => e.solved).length >= 2 ? "good" : "bad")}>
                  <div className="eyebrow">{t.summary}</div>
                  <h2>{t.saved(log.filter(e => e.solved).length, ROUNDS)}</h2>
                  <button className="secondary" onClick={restart}>{t.again}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <section className="card mt-lg">
        <h2 className="h-card">{t.learnTitle}</h2>
        <p className="muted">{t.learnLead}</p>
        <div className="row mt" role="radiogroup" aria-label={t.trainN}>
          <span className="strong">{t.trainN}:</span>
          {[12, 24, 48].map(n => <button key={n} role="radio" aria-checked={trainN === n} className={trainN === n ? "" : "secondary"} onClick={() => setTrainN(n)}>{n}</button>)}
        </div>
        <div className="row mt" style={{ gap: 28 }}>
          <div className="kpi"><div className="kpi-v">{num(stats.acc * 100)} %</div><div className="kpi-l">{t.testAcc}</div></div>
          <div className="kpi"><div className="kpi-v">{num(stats.q, 1)}</div><div className="kpi-l">{t.avgQ}</div></div>
          <div className="kpi"><div className="kpi-v">{stats.size.leaves}</div><div className="kpi-l">{t.size}</div></div>
        </div>
        {trainN === 12 && <p className="orange strong mt-s">{t.fewData}</p>}
        <div className="pair mt">
          <div>
            <b>{t.gainTitle}</b>
            <div className="muted">{t.entropy(num(h0, 2))}</div>
            <div className="stack-s mt-s">
              {gains.map((g, i) => (
                <div key={g.f} className="barrow wide-label">
                  <span>{t.qShort[g.f]}</span>
                  <div className="track"><div className="fill" style={{ width: Math.min(100, (g.g / Math.max(gains[0].g, 0.01)) * 100) + "%", background: i === 0 ? "#1E6B4E" : "#A9B7AD" }} /></div>
                  <b>{num(g.g, 2)}</b>
                </div>
              ))}
            </div>
            <p className="muted mt-s">{t.gainHint}</p>
          </div>
          <div>
            <b>{t.tree}</b>
            <div className="treebox mt-s"><TreeView node={tree} t={t} /></div>
          </div>
        </div>
      </section>

      <div className="stack mt-lg">
        <Tutor module="repair" ctx={tutorCtx} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
