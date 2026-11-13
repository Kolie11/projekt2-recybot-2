import { useMemo, useState } from "react";
import { Tutor } from "../ai/TutorContext.jsx";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { AXES, BADGE_MIN, BADGE_SCORE, PARAMS, allVariants, evaluate, paretoFront } from "../logic/tycoon.js";

const TEXT = {
  de: {
    eyebrow: "Modul 3 · Lifecycle Tycoon", title: "Entwirf einen Wasserkocher für die Kreislaufwirtschaft",
    lead: "Drei Entscheidungen mit je drei Möglichkeiten ergeben 27 Varianten. Gesucht ist kein Rekord in einer Disziplin, sondern ein Gerät, das gut für die Umwelt ist und trotzdem gekauft wird.",
    tried: "Ausprobiert",
    params: {
      material: ["1 · Material", "beeinflusst Recycling und CO₂"],
      joint: ["2 · Wie die Teile verbunden sind", "beeinflusst Reparatur und Zerlegen"],
      build: ["3 · Aufbau", "beeinflusst Modularität und Preis"]
    },
    opts: {
      virgin: ["Neuer Kunststoff", "billig, hoher CO₂-Ausstoß"], steel: ["Edelstahl mit Rezyklat", "langlebig, gut trennbar"], composite: ["Verbundmaterial", "leicht, kaum trennbar"],
      glued: ["Verklebt", "günstig, lässt sich nicht öffnen"], clips: ["Geklipst", "schnell, Clips brechen leicht"], screws: ["Verschraubt", "reparierbar, etwas teurer"],
      block: ["Aus einem Stück", "ein Defekt, alles kaputt"], partly: ["Teilweise modular", "Heizplatte austauschbar"], modular: ["Komplett modular", "alles austauschbar, teuer"]
    },
    axes: { recycling: "Recycling", repair: "Reparatur", durability: "Haltbarkeit", price: "Bezahlbarkeit", co2: "CO₂-Bilanz" },
    balance: "Balance-Score", price: "Preis", life: "Lebensdauer", years: "J.",
    badge: "Abzeichen „EcoDesigner:in“", badgeGot: "Freigeschaltet: Deine Lösung ist ausgewogen.", badgeRule: `Nur für Balance: Score ab ${BADGE_SCORE} und kein Wert unter ${BADGE_MIN}.`,
    why: {
      badge: ["Ausgewogen", "Gut für die Umwelt und trotzdem bezahlbar. Genau darum geht es beim kreislauffähigen Design."],
      modular: ["Zu teuer für den Markt", "Komplett modular ist für die Umwelt ideal. Aber ein Wasserkocher für über 60 € steht im Laden. Ein Gerät, das niemand kauft, hilft dem Kreislauf auch nicht."],
      composite: ["Verbundmaterial ist eine Sackgasse", "Verbundmaterialien lassen sich kaum wieder in ihre Bestandteile trennen. Am Ende ihres Lebens werden sie meist verbrannt."],
      weak: (a, v) => [`Schwächster Wert: ${a} (${v})`, `Verbessere ${a}, ohne die anderen Werte stark abzusenken.`]
    },
    pareto: "Alle 27 Varianten im Vergleich", paretoHint: "Jeder Punkt ist eine Variante. Grün umrandet: die Pareto-Front. Dort kann man die Umwelt nur noch verbessern, wenn das Gerät teurer wird.",
    you: "deine Variante", xAxis: "Preis in €", yAxis: "Umweltwert",
    onFront: "Deine Variante liegt auf der Pareto-Front. Besser geht es nur, wenn man bei einem Ziel Abstriche macht.",
    offFront: "Es gibt mindestens eine Variante, die umweltfreundlicher und gleichzeitig billiger ist als deine.",
    merk: "Schon beim Entwurf entscheiden Material, Verbindungen und Aufbau, ob ein Produkt später repariert und recycelt werden kann, und ob es überhaupt jemand kauft.",
    concept: [
      { h: "Design for Circularity", p: "Bocken et al. (2016) beschreiben drei Hebel für kreislauffähige Produkte: Materialwahl, Modularität und Zerlegbarkeit. Genau diese drei Hebel stellst du hier ein. Ein Gerät, das sich öffnen lässt, kann repariert werden. Ein Material, das sortenrein bleibt, kann recycelt werden." },
      { h: "Warum nur 3 × 3 Möglichkeiten?", p: "Das Arbeitsgedächtnis kann nur wenige Dinge gleichzeitig verarbeiten (Sweller, 1988). Drei Entscheidungen mit je drei Optionen sind genug, um echte Zielkonflikte zu erleben, ohne den Überblick zu verlieren." },
      { h: "Mehrere Ziele gleichzeitig: die Pareto-Front", p: "Wenn Ziele gegeneinander arbeiten, gibt es nicht die eine beste Lösung. Eine Variante ist „Pareto-optimal“, wenn keine andere Variante in allen Zielen mindestens gleich gut und in einem besser ist. Optimierungs-KIs suchen bei solchen Problemen genau diese Front und überlassen die letzte Entscheidung dem Menschen." },
      { h: "Warum das Abzeichen nur für Balance?", p: "Spielelemente motivieren vor allem dann, wenn sie echtes Können belohnen (Van Roy & Zaman, 2019). Ein Abzeichen für den höchsten Einzelwert würde das falsche Ziel belohnen." }
    ],
    terms: [["Pareto-optimal", "nicht in allen Zielen zu schlagen"], ["Modularität", "Teile einzeln austauschbar"], ["Rezyklat", "Material aus recyceltem Abfall"]]
  },
  en: {
    eyebrow: "Module 3 · Lifecycle Tycoon", title: "Design a kettle for the circular economy",
    lead: "Three decisions with three options each give 27 variants. You are not chasing a record in one category. You want a kettle that is good for the planet and that people will still buy.",
    tried: "Tried",
    params: {
      material: ["1 · Material", "affects recycling and CO₂"],
      joint: ["2 · How the parts are joined", "affects repair and disassembly"],
      build: ["3 · Construction", "affects modularity and price"]
    },
    opts: {
      virgin: ["Virgin plastic", "cheap, high CO₂"], steel: ["Steel with recycled content", "durable, easy to separate"], composite: ["Composite material", "light, hard to separate"],
      glued: ["Glued", "cheap, cannot be opened"], clips: ["Clipped", "quick, clips break easily"], screws: ["Screwed", "repairable, a bit pricier"],
      block: ["One single piece", "one fault breaks everything"], partly: ["Partly modular", "heating plate replaceable"], modular: ["Fully modular", "everything replaceable, expensive"]
    },
    axes: { recycling: "Recycling", repair: "Repair", durability: "Durability", price: "Affordability", co2: "CO₂ footprint" },
    balance: "Balance score", price: "Price", life: "Lifetime", years: "yrs",
    badge: "“EcoDesigner” badge", badgeGot: "Unlocked: your design is balanced.", badgeRule: `Balance only: score of ${BADGE_SCORE} or more and no value below ${BADGE_MIN}.`,
    why: {
      badge: ["Balanced", "Good for the planet and still affordable. That is what circular design is about."],
      modular: ["Too expensive for the market", "Fully modular is ideal for the environment, but a kettle for more than €60 stays on the shelf. A product nobody buys does not help the cycle either."],
      composite: ["Composite is a dead end", "Composite materials can hardly be separated back into their parts. At the end of their life they are usually burned."],
      weak: (a, v) => [`Weakest value: ${a} (${v})`, `Improve ${a} without pulling the other values down too much.`]
    },
    pareto: "All 27 variants compared", paretoHint: "Each dot is one variant. Outlined in green: the Pareto front. There you can only improve the environmental value by making the kettle more expensive.",
    you: "your variant", xAxis: "Price in €", yAxis: "Environmental value",
    onFront: "Your variant sits on the Pareto front. You can only do better by giving something up on one of the goals.",
    offFront: "There is at least one variant that is greener and cheaper than yours at the same time.",
    merk: "Material, joints and construction decide at the design stage whether a product can be repaired and recycled later, and whether anyone buys it at all.",
    concept: [
      { h: "Design for circularity", p: "Bocken et al. (2016) describe three levers for circular products: choice of material, modularity and ease of disassembly. Those are exactly the three levers you set here. A device that can be opened can be repaired. A material that stays pure can be recycled." },
      { h: "Why only 3 × 3 options?", p: "Working memory can only handle a few things at once (Sweller, 1988). Three decisions with three options each are enough to feel real trade-offs without losing track." },
      { h: "Several goals at once: the Pareto front", p: "When goals pull against each other, there is no single best solution. A variant is “Pareto-optimal” if no other variant is at least as good on every goal and better on one. Optimisation AIs look for exactly this front and leave the final choice to people." },
      { h: "Why is the badge only for balance?", p: "Game elements motivate most when they reward real competence (Van Roy & Zaman, 2019). A badge for the highest single value would reward the wrong goal." }
    ],
    terms: [["Pareto-optimal", "cannot be beaten on every goal"], ["Modularity", "parts can be replaced one by one"], ["Recycled content", "material made from recycled waste"]]
  }
};

function Radar({ values, labels }) {
  const cx = 150, cy = 150, R = 100;
  const pt = (i, r) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = vals => vals.map((v, i) => pt(i, (v / 100) * R).join(",")).join(" ");
  const pos = [[150, 30, "middle"], [258, 118, "start"], [222, 266, "middle"], [78, 266, "middle"], [42, 118, "end"]];
  return (
    <svg viewBox="-40 0 380 285" width="100%" style={{ maxWidth: 380 }} role="img" aria-label={labels.map((l, i) => `${l} ${values[i]}`).join(", ")}>
      {[1, 0.5].map(f => <polygon key={f} points={poly([100, 100, 100, 100, 100].map(v => v * f))} fill={f === 1 ? "#F6F8F5" : "none"} stroke="#D3DCD3" strokeDasharray={f === 1 ? "" : "4 4"} />)}
      {labels.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#D3DCD3" />; })}
      <polygon points={poly(values)} fill="#1E6B4E" fillOpacity="0.25" stroke="#1E6B4E" strokeWidth="3" />
      {values.map((v, i) => { const [x, y] = pt(i, (v / 100) * R); return <circle key={i} cx={x} cy={y} r="4" fill="#1E6B4E" />; })}
      {labels.map((a, i) => <text key={a} x={pos[i][0]} y={pos[i][1]} textAnchor={pos[i][2]} fontSize="13" fontWeight="700" fill="#142019">{a} {values[i]}</text>)}
    </svg>
  );
}

function Pareto({ variants, front, current, t }) {
  const W = 420, H = 230, x0 = 44, y0 = 195;
  const X = p => x0 + ((p - 20) / 65) * (W - x0 - 14), Y = e => y0 - ((e - 30) / 60) * 175;
  const frontKeys = new Set(front.map(f => f.key));
  const sorted = [...front].sort((a, b) => a.price - b.price);
  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} width="100%" role="img" aria-label={t.pareto}>
      <line x1={x0} y1={y0} x2={W - 10} y2={y0} stroke="#D3DCD3" /><line x1={x0} y1={14} x2={x0} y2={y0} stroke="#D3DCD3" />
      <text x={(W + x0) / 2} y={H + 8} textAnchor="middle" fontSize="11" fill="#4A5A50">{t.xAxis}</text>
      <text x={12} y={(y0 + 14) / 2} fontSize="11" fill="#4A5A50" transform={`rotate(-90 12 ${(y0 + 14) / 2})`} textAnchor="middle">{t.yAxis}</text>
      {[20, 40, 60, 80].map(p => <text key={p} x={X(p)} y={y0 + 14} textAnchor="middle" fontSize="10" fill="#4A5A50">{p}</text>)}
      {[40, 60, 80].map(e => <text key={e} x={x0 - 6} y={Y(e) + 4} textAnchor="end" fontSize="10" fill="#4A5A50">{e}</text>)}
      <polyline points={sorted.map(f => `${X(f.price)},${Y(f.eco)}`).join(" ")} fill="none" stroke="#1E6B4E" strokeWidth="1.5" strokeDasharray="4 3" />
      {variants.map(v => (
        <circle key={v.key} cx={X(v.price)} cy={Y(v.eco)} r={frontKeys.has(v.key) ? 6 : 4.5}
          fill={v.badge ? "#7FD1A8" : "#A9B7AD"} stroke={frontKeys.has(v.key) ? "#1E6B4E" : "none"} strokeWidth="2" opacity="0.9" />
      ))}
      <circle cx={X(current.price)} cy={Y(current.eco)} r="11" fill="none" stroke="#C2410C" strokeWidth="3" />
      <text x={X(current.price) + 14} y={Y(current.eco) + 4} fontSize="12" fontWeight="700" fill="#9A3412">{t.you}</text>
    </svg>
  );
}

export default function LifecycleTycoon({ report, saved }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const initial = saved?.choice && PARAMS.every(p => p.options.some(o => o.id === saved.choice[p.id])) ? saved.choice : { material: "virgin", joint: "glued", build: "block" };
  const [choice, setChoice] = useState(initial);
  const [seen, setSeen] = useState(() => new Set([Object.values(initial).join("-")]));
  const [badgeEver, setBadgeEver] = useState(!!saved?.badge);
  const ev = useMemo(() => evaluate(choice), [choice]);
  const variants = useMemo(() => allVariants(), []);
  const front = useMemo(() => paretoFront(variants), [variants]);
  const key = `${choice.material}-${choice.joint}-${choice.build}`;
  const onFront = front.some(f => f.key === key);
  const axisLabels = AXES.map(a => t.axes[a]);

  const pick = (pid, oid) => {
    const next = { ...choice, [pid]: oid };
    setChoice(next);
    setSeen(s => new Set(s).add(Object.values(next).join("-")));
    const e = evaluate(next);
    const badge = e.badge || badgeEver;
    if (e.badge) setBadgeEver(true);
    report({ choice: next, material: next.material, score: e.score, badge }, badge);
  };

  const weakest = ev.axes.indexOf(ev.min);
  const [tone, [wt, wx]] = ev.badge ? ["ok", t.why.badge]
    : choice.build === "modular" && ev.axes[3] < BADGE_MIN ? ["warn", t.why.modular]
    : choice.material === "composite" ? ["warn", t.why.composite]
    : ["info", t.why.weak(axisLabels[weakest], ev.min)];

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <div className="pill-kpi"><span>{t.tried}</span><b>{seen.size} / 27</b></div>
      </ModuleIntro>
      <div className="split">
        <div className="main stack">
          {PARAMS.map(p => (
            <section className="card" key={p.id}>
              <div className="row between"><b>{t.params[p.id][0]}</b><span className="muted">{t.params[p.id][1]}</span></div>
              <div className="grid3 mt" role="radiogroup" aria-label={t.params[p.id][0]}>
                {p.options.map(o => (
                  <button key={o.id} role="radio" aria-checked={choice[p.id] === o.id} className={"opt tall-opt" + (choice[p.id] === o.id ? " on" : "")} onClick={() => pick(p.id, o.id)}>
                    <b>{t.opts[o.id][0]}</b><span>{t.opts[o.id][1]}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <section className="card">
            <b>{t.pareto}</b>
            <Pareto variants={variants} front={front} current={variants.find(v => v.key === key)} t={t} />
            <p className="muted">{t.paretoHint}</p>
            <p className={onFront ? "green strong" : "orange strong"}>{onFront ? t.onFront : t.offFront}</p>
          </section>
        </div>
        <aside className="side stack">
          <section className="card center">
            <Radar values={ev.axes} labels={axisLabels} />
            <div className="row" style={{ gap: 24 }}>
              <div className="kpi"><div className="kpi-v">{ev.score}</div><div className="kpi-l">{t.balance}</div></div>
              <div className="kpi"><div className="kpi-v">{num(ev.price)} €</div><div className="kpi-l">{t.price}</div></div>
              <div className="kpi"><div className="kpi-v">{ev.years} {t.years}</div><div className="kpi-l">{t.life}</div></div>
            </div>
          </section>
          <Why tone={tone} title={wt}>{wx}</Why>
          <section className={"card badge-card" + (badgeEver ? " got" : "")}>
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="23" fill={badgeEver ? "#DCEFE4" : "#ECEEEC"} stroke={badgeEver ? "#1E6B4E" : "#A9B7AD"} strokeWidth="2" />
              <path d="M17 27 l6 6 l12 -13" fill="none" stroke={badgeEver ? "#1E6B4E" : "#A9B7AD"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div><b>{t.badge}</b><div className="muted">{badgeEver ? t.badgeGot : t.badgeRule}</div></div>
          </section>
        </aside>
      </div>
      <div className="stack mt-lg">
        <Tutor module="tycoon" ctx={{
          score: ev.score, min: ev.min, weakest: axisLabels[weakest], weakestV: ev.min, badge: ev.badge,
          composite: choice.material === "composite", price: ev.price, years: ev.years, onFront
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
