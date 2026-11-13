import { useMemo, useState } from "react";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { Tutor } from "../ai/TutorContext.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { GOAL_R, GOAL_S, LIMITS, RAIN, ROUNDS, START_YEAR, goalsMet, initialState, optimise, runPolicy, step, yearCost } from "../logic/policy.js";

const TEXT = {
  de: {
    eyebrow: "Modul 6 · Policy Simulator", title: "Du regierst Grünstadt",
    lead: `In ${ROUNDS} Jahren soll die Recyclingquote auf mindestens ${GOAL_R} % steigen. Die Zufriedenheit muss über ${GOAL_S} % bleiben und das Budget darf nicht ins Minus rutschen.`,
    year: "Jahr", round: (a, b) => `Runde ${a}/${b}`,
    levers: "Deine Stellschrauben", deposit: "Pfand pro Flasche", containers: "Neue Sammelcontainer pro Jahr", campaign: "Aufklärungskampagne", repair: "Förderung von Reparaturcafés",
    levels: ["keine", "klein", "mittel", "groß"], costYear: "Kosten in diesem Jahr", budgetLeft: "Restbudget", mio: v => `${v} Mio. €`,
    simulate: y => `Jahr ${y} simulieren`, newTerm: "Neue Amtszeit",
    quota: "Recyclingquote", goal: v => `Ziel ${v} %`,
    loop: "Rückkopplung", loopSteps: ["höheres Pfand", "mehr Flaschen zurück", "Ärger, wo Automaten fehlen", "sinkende Zufriedenheit"],
    satisfaction: "Zufriedenheit nach Stadtteil", low: "unzufrieden", high: "zufrieden",
    districts: { oldtown: "Altstadt", campus: "Uni-Viertel", harbour: "Hafen", northpark: "Nordpark", industry: "Gewerbegebiet", southhill: "Südhang" },
    result: n => `Bilanz nach ${n} Jahren`, allGoals: "Alle drei Ziele erreicht", someGoals: n => `${n} von 3 Zielen erreicht`,
    resultLine: (r, s, b) => `Quote ${r} % · Zufriedenheit ${s} % · Budget ${b} Mio. €`,
    why: {
      start: ["Stell die Hebel ein und starte das erste Jahr", "Neue Container und Kampagnen wirken erst im Jahr danach."],
      budget: ["Das Budget ist überzogen", "Die Stadt gibt mehr aus, als sie hat. Weniger Container oder eine kleinere Kampagne helfen."],
      district: d => [`Warum ist ${d} so unzufrieden?`, "Dort gibt es wenige Rückgabestellen. Das hohe Pfand trifft die Leute, ohne dass sie es leicht zurückbekommen. Mehr Container würden helfen."],
      slow: ["Warum steigt die Quote so langsam?", "Gewohnheiten ändern sich nicht über Nacht. Container und Kampagnen wirken erst ein Jahr später."],
      good: ["Die Richtung stimmt", "Quote und Zufriedenheit entwickeln sich gut. Behalte das Budget im Auge."]
    },
    corr: ["Ursache oder Zufall?", r => `Die Zahl der Regentage ist genauso gestiegen wie die Recyclingquote (dieses Jahr ${r}). Trotzdem bringt Regen niemanden dazu, Flaschen zurückzugeben. Das ist eine Korrelation, keine Ursache.`],
    aiTitle: "Frag den KI-Berater", aiLead: "Der Berater spielt jede mögliche Kombination der Hebel für alle sechs Jahre durch und empfiehlt die beste. Was „beste“ heißt, legst du fest.",
    weight: "Was soll der KI wichtiger sein?", wQuota: "Recyclingquote", wHappy: "Zufriedenheit",
    aiRun: "Empfehlung berechnen", aiTried: n => `${n} Strategien durchgerechnet`,
    aiRec: "Empfehlung", aiPred: (r, s, b) => `Erwartet nach 6 Jahren: Quote ${r} %, Zufriedenheit ${s} %, Restbudget ${b} Mio. €`,
    aiApply: "Empfehlung übernehmen",
    aiNote: "Schieb den Regler ganz nach links und ganz nach rechts. Die KI ändert ihre Empfehlung, obwohl die Stadt dieselbe ist. Sie optimiert nur das, was wir ihr als Ziel vorgeben.",
    merk: "Systeme reagieren verzögert und mit Nebenwirkungen. Gute Politik denkt Rückkopplungen mit und trennt Ursache von Zufall. Eine KI kann Strategien durchrechnen, aber das Ziel muss ein Mensch festlegen.",
    concept: [
      { h: "Systemdynamik", p: "Das Modell hinter Grünstadt besteht aus Beständen (Recyclingquote, Container, Budget), Flüssen (was jedes Jahr dazukommt oder abfließt) und Verzögerungen. Sterman (2000) zeigt, dass gerade Verzögerungen und Rückkopplungen dazu führen, dass Menschen in komplexen Systemen falsch entscheiden." },
      { h: "Rückkopplungen", p: "Ein höheres Pfand bringt mehr Flaschen zurück. Wo Automaten fehlen, sinkt aber die Zufriedenheit, und wer verärgert ist, macht weniger mit. Diese bremsende Schleife siehst du in der Karte. Meadows (2008) nennt solche Stellen Hebelpunkte: Dort wirkt ein kleiner Eingriff besonders stark." },
      { h: "Korrelation ist keine Kausalität", p: "Zwei Kurven, die gemeinsam steigen, müssen nichts miteinander zu tun haben (Pearl & Mackenzie, 2018). Die Regentage sind absichtlich eingebaut, um diesen Denkfehler sichtbar zu machen." },
      { h: "Der KI-Berater: Suche und Zielfunktion", p: "Der Berater ist ein Suchalgorithmus. Er simuliert über tausend Strategien und bewertet jede mit einer Zielfunktion: Gewicht × Quote + Gewicht × Zufriedenheit, solange das Budget reicht. Ändert man die Gewichte, ändert sich die „beste“ Strategie. Genau deshalb ist die Wahl des Ziels eine menschliche, oft politische Entscheidung." }
    ],
    terms: [["Bestand", "Größe, die sich über Zeit ansammelt"], ["Verzögerung", "Wirkung kommt später als die Ursache"], ["Zielfunktion", "Formel, nach der die KI „gut“ bewertet"]]
  },
  en: {
    eyebrow: "Module 6 · Policy Simulator", title: "You run Greenville",
    lead: `Within ${ROUNDS} years the recycling rate should reach at least ${GOAL_R} %. Satisfaction has to stay above ${GOAL_S} % and the budget must not go into the red.`,
    year: "Year", round: (a, b) => `Round ${a}/${b}`,
    levers: "Your levers", deposit: "Deposit per bottle", containers: "New collection bins per year", campaign: "Awareness campaign", repair: "Funding for repair cafés",
    levels: ["none", "small", "medium", "large"], costYear: "Cost this year", budgetLeft: "Budget left", mio: v => `€${v} m`,
    simulate: y => `Simulate ${y}`, newTerm: "New term in office",
    quota: "Recycling rate", goal: v => `Goal ${v} %`,
    loop: "Feedback loop", loopSteps: ["higher deposit", "more bottles returned", "annoyance where machines are missing", "falling satisfaction"],
    satisfaction: "Satisfaction by district", low: "unhappy", high: "happy",
    districts: { oldtown: "Old town", campus: "Campus", harbour: "Harbour", northpark: "North park", industry: "Industrial area", southhill: "South hill" },
    result: n => `Result after ${n} years`, allGoals: "All three goals reached", someGoals: n => `${n} of 3 goals reached`,
    resultLine: (r, s, b) => `Rate ${r} % · satisfaction ${s} % · budget €${b} m`,
    why: {
      start: ["Set the levers and start the first year", "New bins and campaigns only take effect the year after."],
      budget: ["The budget is overspent", "The city is spending more than it has. Fewer bins or a smaller campaign would help."],
      district: d => [`Why is ${d} so unhappy?`, "There are few return points there. The high deposit hits people without an easy way to get it back. More bins would help."],
      slow: ["Why is the rate rising so slowly?", "Habits don't change overnight. Bins and campaigns only work a year later."],
      good: ["Heading the right way", "Rate and satisfaction are developing well. Keep an eye on the budget."]
    },
    corr: ["Cause or coincidence?", r => `The number of rainy days rose just like the recycling rate (${r} this year). Still, rain does not make anyone return bottles. That is a correlation, not a cause.`],
    aiTitle: "Ask the AI advisor", aiLead: "The advisor plays through every possible combination of levers for all six years and recommends the best one. You decide what “best” means.",
    weight: "What should matter more to the AI?", wQuota: "Recycling rate", wHappy: "Satisfaction",
    aiRun: "Compute recommendation", aiTried: n => `${n} strategies simulated`,
    aiRec: "Recommendation", aiPred: (r, s, b) => `Expected after 6 years: rate ${r} %, satisfaction ${s} %, budget left €${b} m`,
    aiApply: "Use this recommendation",
    aiNote: "Move the slider all the way left and all the way right. The AI changes its recommendation although the city is the same. It only optimises what we give it as a goal.",
    merk: "Systems react with delays and side effects. Good policy thinks about feedback and tells cause from coincidence. An AI can work through strategies, but a person has to set the goal.",
    concept: [
      { h: "System dynamics", p: "The model behind Greenville consists of stocks (recycling rate, bins, budget), flows (what is added or removed each year) and delays. Sterman (2000) shows that delays and feedback in particular lead people to make poor decisions in complex systems." },
      { h: "Feedback loops", p: "A higher deposit brings more bottles back. Where machines are missing, satisfaction drops, and annoyed people take part less. You can see this balancing loop on the map. Meadows (2008) calls such places leverage points: a small intervention there has a large effect." },
      { h: "Correlation is not causation", p: "Two curves that rise together need not have anything to do with each other (Pearl & Mackenzie, 2018). The rainy days are built in on purpose to make this thinking error visible." },
      { h: "The AI advisor: search and objective function", p: "The advisor is a search algorithm. It simulates more than a thousand strategies and scores each one with an objective function: weight × rate + weight × satisfaction, as long as the budget lasts. Change the weights and the “best” strategy changes. That is why choosing the goal is a human, often political, decision." }
    ],
    terms: [["Stock", "a quantity that builds up over time"], ["Delay", "the effect comes later than the cause"], ["Objective function", "the formula the AI uses to judge “good”"]]
  }
};

function heat(s) {
  if (s >= 70) return ["#1E6B4E", "#fff"];
  if (s >= 60) return ["#5FA37E", "#142019"];
  if (s >= 50) return ["#A9D4BB", "#142019"];
  if (s >= 40) return ["#F4B183", "#142019"];
  return ["#E07A3F", "#142019"];
}

function Chart({ history, preview, t }) {
  const W = 460, H = 220, x0 = 40, y0 = 190, xs = (W - x0 - 40) / ROUNDS;
  const y = v => y0 - (v / 100) * 170;
  const line = h => h.map((d, i) => `${x0 + i * xs},${y(d.R)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} width="100%" role="img" aria-label={t.quota + ": " + history.map(h => `${h.year} ${h.R} %`).join(", ")}>
      <line x1={x0} y1="20" x2={x0} y2={y0} stroke="#D3DCD3" /><line x1={x0} y1={y0} x2={W - 24} y2={y0} stroke="#D3DCD3" />
      <line x1={x0} y1={y(GOAL_R)} x2={W - 24} y2={y(GOAL_R)} stroke="#1E6B4E" strokeDasharray="6 5" />
      <text x={x0 + 6} y={y(GOAL_R) - 6} fontSize="12" fill="#1E6B4E">{t.goal(GOAL_R)}</text>
      {[0, 40, 80].map(v => <text key={v} x={x0 - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#4A5A50">{v}</text>)}
      {Array.from({ length: ROUNDS + 1 }, (_, i) => <text key={i} x={x0 + i * xs} y={y0 + 18} textAnchor="middle" fontSize="12" fill="#4A5A50">{START_YEAR + i}</text>)}
      {preview && <polyline points={line(preview)} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeDasharray="5 5" />}
      <polyline points={line(history)} fill="none" stroke="#142019" strokeWidth="3.5" />
      {history.map((d, i) => <circle key={i} cx={x0 + i * xs} cy={y(d.R)} r="5" fill="#142019" />)}
      {history.length > 1 && <text x={x0 + (history.length - 1) * xs + 8} y={y(history[history.length - 1].R) - 8} fontSize="13" fontWeight="700" fill="#142019">{history[history.length - 1].R} %</text>}
    </svg>
  );
}

export default function PolicySimulator({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const [lev, setLev] = useState({ deposit: 0.25, containers: 60, campaign: 1, repair: 0 });
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState(() => [{ year: START_YEAR, R: 38, S: 62 }]);
  const [weight, setWeight] = useState(50);
  const [advice, setAdvice] = useState(null);
  const round = history.length - 1, over = round >= ROUNDS;
  const mio = v => t.mio(num(v, 2));

  const simulate = () => {
    const next = step(state, lev);
    setState(next);
    const h = [...history, { year: next.year, R: next.R, S: next.S }];
    setHistory(h);
    if (h.length - 1 >= ROUNDS) {
      const g = goalsMet(next);
      report({ R: next.R, S: next.S, budget: next.budget, goals: g.R && g.S && g.budget });
    }
  };
  const reset = () => { setState(initialState()); setHistory([{ year: START_YEAR, R: 38, S: 62 }]); };
  const ask = () => setAdvice(optimise({ R: (100 - weight) / 50, S: weight / 50 }));
  const preview = useMemo(() => (advice && round === 0 ? runPolicy(advice.lev).history : null), [advice, round]);

  const worst = [...state.districts].sort((a, b) => a.s - b.s)[0];
  const g = goalsMet(state);
  const [tone, [wt, wx]] = round === 0 ? ["info", t.why.start]
    : state.budget < 0 ? ["warn", t.why.budget]
    : worst.s < 50 && lev.deposit > 0.3 ? ["warn", t.why.district(t.districts[worst.id])]
    : round >= 2 && state.R < GOAL_R ? ["info", t.why.slow] : ["ok", t.why.good];

  const lever = (id, label, fmt) => {
    const [min, max, stepv] = LIMITS[id];
    return (
      <div key={id}>
        <div className="row between"><label htmlFor={"lv-" + id}>{label}</label><b>{fmt(lev[id])}</b></div>
        <input id={"lv-" + id} type="range" min={min} max={max} step={stepv} value={lev[id]} disabled={over}
          onChange={e => setLev(l => ({ ...l, [id]: +e.target.value }))} />
      </div>
    );
  };

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <div className="pill-kpi"><span>{t.year}</span><b>{state.year} · {t.round(Math.min(round + 1, ROUNDS), ROUNDS)}</b></div>
      </ModuleIntro>
      <div className="split3">
        <section className="card stack">
          <b>{t.levers}</b>
          {lever("deposit", t.deposit, v => num(v, 2) + " €")}
          {lever("containers", t.containers, v => num(v))}
          {lever("campaign", t.campaign, v => t.levels[v])}
          {lever("repair", t.repair, v => t.levels[v])}
          <div className="soft-box row between"><span>{t.costYear}</span><b>{mio(yearCost(lev))}</b></div>
          <div className={"soft-box row between" + (state.budget < 0 ? " bad" : "")}><span>{t.budgetLeft}</span><b>{mio(state.budget)}</b></div>
          {!over ? <button className="wide" onClick={simulate}>{t.simulate(state.year + 1)}</button> : <button className="wide secondary" onClick={reset}>{t.newTerm}</button>}
        </section>

        <section className="stack">
          <div className="card">
            <div className="row between"><b>{t.quota}</b><span className="muted">{t.goal(GOAL_R)}</span></div>
            <Chart history={history} preview={preview} t={t} />
          </div>
          <div className="card">
            <b>{t.loop}</b>
            <div className="chain mt-s">
              <span>{t.loopSteps[0]}</span><i>→</i><span className="good">{t.loopSteps[1]}</span><i>→</i><span className="bad">{t.loopSteps[2]}</span><i>→</i><span className="bad">{t.loopSteps[3]}</span>
            </div>
          </div>
          {over && (
            <div className={"res " + (g.R && g.S && g.budget ? "good" : "bad")}>
              <div className="eyebrow">{t.result(ROUNDS)}</div>
              <h2>{g.R && g.S && g.budget ? t.allGoals : t.someGoals([g.R, g.S, g.budget].filter(Boolean).length)}</h2>
              <p>{t.resultLine(state.R, state.S, num(state.budget, 2))}</p>
            </div>
          )}
        </section>

        <aside className="stack">
          <section className="card">
            <div className="row between"><b>{t.satisfaction}</b><span className="big-num">{state.S} %</span></div>
            <div className="heat mt">
              {state.districts.map(d => { const [bg, fg] = heat(d.s); return <div key={d.id} style={{ background: bg, color: fg }}>{t.districts[d.id]}<br /><b>{d.s} %</b></div>; })}
            </div>
            <div className="row between muted mt-s"><span>{t.low}</span><span>{t.high}</span></div>
          </section>
          <Why tone={tone} title={wt}>{wx}</Why>
          {round >= 2 && <Why tone="info" title={t.corr[0]}>{t.corr[1](RAIN[round])}</Why>}
        </aside>
      </div>

      <section className="card mt-lg ai-card">
        <div className="row between"><h2 className="h-card" style={{ margin: 0 }}>{t.aiTitle}</h2><span className="tag ai">KI</span></div>
        <p className="muted">{t.aiLead}</p>
        <div className="row mt" style={{ alignItems: "center" }}>
          <label htmlFor="w" className="strong">{t.weight}</label>
          <span className="muted">{t.wQuota}</span>
          <input id="w" type="range" min="0" max="100" step="10" value={weight} onChange={e => { setWeight(+e.target.value); setAdvice(null); }} style={{ flex: 1, minWidth: 160 }} />
          <span className="muted">{t.wHappy}</span>
          <button onClick={ask}>{t.aiRun}</button>
        </div>
        {advice && (
          <div className="advice mt">
            <div className="muted">{t.aiTried(num(advice.tried))}</div>
            <div className="row mt-s" style={{ gap: 18 }}>
              <span><b>{t.deposit}:</b> {num(advice.lev.deposit, 2)} €</span>
              <span><b>{t.containers}:</b> {advice.lev.containers}</span>
              <span><b>{t.campaign}:</b> {t.levels[advice.lev.campaign]}</span>
              <span><b>{t.repair}:</b> {t.levels[advice.lev.repair]}</span>
            </div>
            <p className="mt-s">{t.aiPred(advice.final.R, advice.final.S, num(advice.final.budget, 2))}</p>
            {!over && <button className="secondary" onClick={() => setLev(advice.lev)}>{t.aiApply}</button>}
            <p className="muted mt-s">{t.aiNote}</p>
          </div>
        )}
      </section>

      <div className="stack mt-lg">
        <Tutor module="policy" ctx={{
          year: state.year, round, rounds: ROUNDS, R: state.R, S: state.S, budget: state.budget, goalR: GOAL_R, goalS: GOAL_S,
          worst: t.districts[worst.id], worstS: worst.s, over, goals: g.R && g.S,
          dR: round > 0 ? history[round].R - history[round - 1].R : 0, dS: round > 0 ? history[round].S - history[round - 1].S : 0,
          levers: `${t.deposit} ${num(lev.deposit, 2)} €, ${t.containers} ${lev.containers}, ${t.campaign} ${t.levels[lev.campaign]}, ${t.repair} ${t.levels[lev.repair]}`
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
