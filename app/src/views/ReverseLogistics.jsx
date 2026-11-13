import { useEffect, useMemo, useRef, useState } from "react";
import { Tutor } from "../ai/TutorContext.jsx";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { bruteForce, closedTour, crossings, factorial, nearestNeighbour, pointAt, tourLength, twoOpt } from "../logic/tsp.js";

const DEPOT = [80, 400];
const POOL = [[210, 250], [180, 120], [330, 80], [470, 160], [320, 330], [500, 380], [640, 300], [600, 90], [400, 230], [700, 180], [120, 300], [560, 230]];
const KM = 0.034; // km pro Bildpunkt

const TEXT = {
  de: {
    eyebrow: "Modul 5 · Reverse Logistics", title: "Plan die Sammeltour. Bist du schneller als der Algorithmus?",
    lead: "Klick die Sammelstellen in der Reihenfolge an, in der der Wagen sie anfahren soll. Er startet am Wertstoffhof und kehrt am Ende dorthin zurück.",
    stops: n => `${n} Stopps`, depot: "Hof", stop: n => `Sammelstelle ${n}`,
    undo: "Rückgängig", reset: "Neu planen", replay: "Wettfahrt abspielen", timeline: "Zeitleiste",
    yourRoute: "Deine Route", aiRoute: "Route des Algorithmus",
    vs: "Du gegen den Algorithmus", you: "Du", ai: "Algorithmus", hidden: "verdeckt", min: m => `ca. ${m} Min.`,
    longer: p => `Du fährst ${p} % weiter.`, equal: "Genauso gut wie der Algorithmus.",
    algos: "Drei Verfahren im Vergleich", nn: "Nächster Nachbar", nnD: "immer zum nächsten offenen Stopp",
    opt: "2-opt", optD: "Kreuzungen auflösen, bis nichts mehr besser wird", exact: "Alle Routen ausprobieren", exactD: n => `${n} Routen geprüft`,
    exactNo: n => `Unmöglich: ${n} Routen`, ms: v => `${v} ms`,
    steps: "So verbessert 2-opt die Route", stepOf: (a, b) => `Schritt ${a} von ${b}`, stepHint: "Bei jedem Schritt wird ein Stück der Route umgedreht. Dadurch verschwindet meist eine Kreuzung.",
    count: "Wie viele Reihenfolgen gibt es?",
    countHint: "Mit jedem Stopp wird die Zahl riesig. Darum probiert niemand alle aus, sondern nutzt kluge Faustregeln.",
    why: {
      start: n => [`Klick die Sammelstellen an (${n})`, "Der Wagen fährt nach dem letzten Stopp automatisch zum Hof zurück."],
      top: ["Stark", "Deine Route ist praktisch so kurz wie die des Algorithmus. Mit 12 Stopps wird das deutlich schwieriger."],
      cross: n => [`Deine Route kreuzt sich ${n}-mal`, "Wo sich eine Route selbst kreuzt, gibt es fast immer einen kürzeren Weg. Genau diese Regel nutzt 2-opt."],
      long: p => [`${p} % Umweg`, "Schau dir unten an, wie 2-opt die Route Schritt für Schritt kürzer macht."]
    },
    merk: "Mit jedem Stopp wächst die Zahl der möglichen Routen explosionsartig. Algorithmen mit klugen Faustregeln finden in Sekundenbruchteilen sehr gute Touren. Ob sie im Alltag passen (Baustelle, Schulbeginn), entscheidet weiter ein Mensch.",
    concept: [
      { h: "Das Problem des Handlungsreisenden", p: "Die kürzeste Rundtour durch viele Orte zu finden, ist ein berühmtes Problem der Informatik (Traveling Salesman Problem). Applegate et al. (2006) zeigen, wie aufwendig es selbst für Computer wird." },
      { h: "Kombinatorische Explosion", p: <p>Bei n Stopps gibt es n! (n Fakultät) Reihenfolgen. 5 Stopps: 120. 8 Stopps: 40.320. 12 Stopps: fast 480 Millionen. Ein Computer schafft 8 Stopps durch Ausprobieren in Millisekunden. Bei 20 Stopps bräuchte er länger, als das Universum alt ist.</p> },
      { h: "Heuristiken: Nächster Nachbar und 2-opt", p: "Statt alles auszuprobieren, nutzen echte Tourenplaner Faustregeln. „Nächster Nachbar“ fährt einfach immer zum nächstgelegenen Stopp. 2-opt nimmt eine fertige Route und dreht so lange Teilstücke um, bis keine Verbesserung mehr möglich ist. Das Ergebnis ist nicht garantiert optimal, aber fast immer sehr gut." },
      { h: "Mensch und KI zusammen", p: "Zheng et al. (2017) beschreiben das Prinzip „Human in the Loop“: Die Maschine rechnet, der Mensch prüft und kennt den Kontext, den kein Algorithmus sieht." }
    ],
    terms: [["Heuristik", "Faustregel, schnell und meist gut"], ["n!", "1 · 2 · 3 · … · n"], ["optimal", "nachweislich die beste Lösung"]]
  },
  en: {
    eyebrow: "Module 5 · Reverse Logistics", title: "Plan the collection round. Can you beat the algorithm?",
    lead: "Click the collection points in the order the truck should visit them. It starts at the recycling yard and returns there at the end.",
    stops: n => `${n} stops`, depot: "Yard", stop: n => `Collection point ${n}`,
    undo: "Undo", reset: "Plan again", replay: "Play the race", timeline: "Timeline",
    yourRoute: "Your route", aiRoute: "Algorithm's route",
    vs: "You vs the algorithm", you: "You", ai: "Algorithm", hidden: "hidden", min: m => `about ${m} min`,
    longer: p => `You drive ${p} % further.`, equal: "As good as the algorithm.",
    algos: "Three methods compared", nn: "Nearest neighbour", nnD: "always to the closest open stop",
    opt: "2-opt", optD: "untangle crossings until nothing improves", exact: "Try every route", exactD: n => `${n} routes checked`,
    exactNo: n => `Impossible: ${n} routes`, ms: v => `${v} ms`,
    steps: "How 2-opt improves the route", stepOf: (a, b) => `Step ${a} of ${b}`, stepHint: "Each step reverses one stretch of the route. That usually removes a crossing.",
    count: "How many orders are there?",
    countHint: "With every stop the number explodes. That is why nobody tries them all; people use clever rules of thumb instead.",
    why: {
      start: n => [`Click the collection points (${n})`, "After the last stop the truck drives back to the yard automatically."],
      top: ["Impressive", "Your route is practically as short as the algorithm's. With 12 stops this gets much harder."],
      cross: n => [`Your route crosses itself ${n} time(s)`, "Wherever a route crosses itself, there is almost always a shorter way. That is exactly the rule 2-opt uses."],
      long: p => [`${p} % detour`, "Look below at how 2-opt makes the route shorter step by step."]
    },
    merk: "Every extra stop makes the number of possible routes explode. Algorithms with clever rules of thumb find very good rounds in a split second. Whether they fit real life (road works, school run) is still for a person to decide.",
    concept: [
      { h: "The travelling salesman problem", p: "Finding the shortest round trip through many places is a famous problem in computer science. Applegate et al. (2006) show how demanding it becomes, even for computers." },
      { h: "Combinatorial explosion", p: <p>With n stops there are n! (n factorial) orders. 5 stops: 120. 8 stops: 40,320. 12 stops: almost 480 million. A computer handles 8 stops by brute force in milliseconds. With 20 stops it would need longer than the age of the universe.</p> },
      { h: "Heuristics: nearest neighbour and 2-opt", p: "Instead of trying everything, real route planners use rules of thumb. Nearest neighbour simply drives to the closest stop each time. 2-opt takes a finished route and keeps reversing stretches until no further improvement is possible. The result is not guaranteed to be optimal, but it is almost always very good." },
      { h: "People and AI together", p: "Zheng et al. (2017) describe the principle of human in the loop: the machine computes, the person checks and knows the context that no algorithm sees." }
    ],
    terms: [["Heuristic", "rule of thumb, quick and usually good"], ["n!", "1 · 2 · 3 · … · n"], ["Optimal", "provably the best solution"]]
  }
};

export default function ReverseLogistics({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const [level, setLevel] = useState(8);
  const [order, setOrder] = useState([]);
  const [tt, setTt] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(null);
  const raf = useRef(null);

  const stops = useMemo(() => POOL.slice(0, level), [level]);
  const algo = useMemo(() => {
    const t0 = performance.now();
    const nn = nearestNeighbour(DEPOT, stops);
    const opt = twoOpt(DEPOT, stops, nn);
    const t1 = performance.now();
    const ex = level <= 8 ? bruteForce(DEPOT, stops) : null;
    const t2 = performance.now();
    return {
      nn, nnLen: tourLength(closedTour(DEPOT, stops, nn)), opt: opt.order, optLen: tourLength(closedTour(DEPOT, stops, opt.order)),
      steps: opt.steps, msHeur: t1 - t0, exact: ex, msExact: t2 - t1
    };
  }, [stops, level]);

  const done = order.length === stops.length;
  const userPts = [DEPOT, ...order.map(i => stops[i]), ...(done ? [DEPOT] : [])];
  const aiPts = closedTour(DEPOT, stops, algo.opt);
  const userKm = tourLength(userPts) * KM, aiKm = algo.optLen * KM;
  const overhead = done ? Math.round((userKm / aiKm - 1) * 100) : null;
  const cross = done ? crossings(userPts) : 0;

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const step = now => { const v = Math.min(1, (now - start) / 4000); setTt(v); if (v < 1) raf.current = requestAnimationFrame(step); else setPlaying(false); };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const changeLevel = n => { setLevel(n); setOrder([]); setTt(1); setPlaying(false); setStepIdx(null); };
  const clickStop = i => {
    if (done || order.includes(i)) return;
    const next = [...order, i];
    setOrder(next);
    if (next.length === stops.length) {
      const oh = Math.round((tourLength(closedTour(DEPOT, stops, next)) / algo.optLen - 1) * 100);
      report({ overhead: oh, stops: level });
      setTt(0); setPlaying(true);
    }
  };

  const maxLen = Math.max(tourLength(userPts), algo.optLen);
  const truck = done ? pointAt(userPts, tt * maxLen) : null, ghost = done ? pointAt(aiPts, tt * maxLen) : null;
  const stepPts = stepIdx !== null ? closedTour(DEPOT, stops, algo.steps[stepIdx].order) : null;

  const [tone, [wt, wx]] = !done ? ["info", t.why.start(`${order.length}/${stops.length}`)]
    : overhead <= 2 ? ["ok", t.why.top] : cross > 0 ? ["warn", t.why.cross(cross)] : ["info", t.why.long(overhead)];

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <div className="row" role="radiogroup">
          {[5, 8, 12].map(n => <button key={n} role="radio" aria-checked={level === n} className={level === n ? "" : "secondary"} onClick={() => changeLevel(n)}>{t.stops(n)}</button>)}
        </div>
      </ModuleIntro>

      <div className="split">
        <div className="main stack">
          <section className="card">
            <div className="stage light">
              <svg viewBox="0 0 740 460" role="img" aria-label={t.lead}>
                <rect width="740" height="460" fill="#E6EDE4" />
                <path d="M0 200 H740 M260 0 V460 M520 0 V460 M0 60 Q300 120 740 40" stroke="#fff" strokeWidth="14" fill="none" />
                <path d="M600 200 Q660 300 740 330 V460 H560 Q560 360 600 200 Z" fill="#CFE3C4" />
                {done && !stepPts && <polyline points={aiPts.map(p => p.join(",")).join(" ")} fill="none" stroke="#C2410C" strokeWidth="4" strokeDasharray="10 8" />}
                {stepPts && <polyline points={stepPts.map(p => p.join(",")).join(" ")} fill="none" stroke="#C2410C" strokeWidth="4" />}
                {!stepPts && <polyline points={userPts.map(p => p.join(",")).join(" ")} fill="none" stroke="#1E6B4E" strokeWidth="5" strokeLinejoin="round" />}
                <rect x={DEPOT[0] - 28} y={DEPOT[1] - 22} width="56" height="44" rx="10" fill="#142019" />
                <text x={DEPOT[0]} y={DEPOT[1] + 5} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{t.depot}</text>
                {stops.map((s, i) => {
                  const pos = order.indexOf(i), free = !done && pos < 0;
                  return (
                    <g key={i} role="button" tabIndex={free ? 0 : -1} aria-label={t.stop(i + 1)} style={{ cursor: free ? "pointer" : "default" }}
                      onClick={() => clickStop(i)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), clickStop(i))}>
                      <circle cx={s[0]} cy={s[1]} r="24" fill="transparent" />
                      <circle cx={s[0]} cy={s[1]} r="16" fill={pos >= 0 ? "#1E6B4E" : "#fff"} stroke="#142019" strokeWidth="3" />
                      <text x={s[0]} y={s[1] + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={pos >= 0 ? "#fff" : "#142019"}>{pos >= 0 ? pos + 1 : "•"}</text>
                    </g>
                  );
                })}
                {ghost && !stepPts && <circle cx={ghost[0]} cy={ghost[1]} r="10" fill="#C2410C" opacity="0.85" />}
                {truck && !stepPts && <rect x={truck[0] - 12} y={truck[1] - 9} width="24" height="18" rx="4" fill="#142019" stroke="#7FD1A8" strokeWidth="3" />}
              </svg>
            </div>
            <div className="row mt">
              <button className="secondary" onClick={() => setOrder(o => o.slice(0, -1))} disabled={!order.length || done}>{t.undo}</button>
              <button className="secondary" onClick={() => { setOrder([]); setTt(1); setStepIdx(null); }}>{t.reset}</button>
              <button onClick={() => { setStepIdx(null); setTt(0); setPlaying(true); }} disabled={!done || playing}>{t.replay}</button>
              <label htmlFor="replay" className="muted">{t.timeline}</label>
              <input id="replay" type="range" min="0" max="100" value={Math.round(tt * 100)} disabled={!done} onChange={e => { setPlaying(false); setStepIdx(null); setTt(+e.target.value / 100); }} style={{ flex: 1, minWidth: 120 }} />
            </div>
            <div className="legend mt-s"><span><i style={{ background: "#1E6B4E" }} />{t.yourRoute}</span><span><i className="dash" />{t.aiRoute}</span></div>
          </section>

          {done && (
            <section className="card">
              <div className="row between"><b>{t.steps}</b>{stepIdx !== null && <span className="muted">{t.stepOf(stepIdx + 1, algo.steps.length)} · {num(algo.steps[stepIdx].len * KM, 1)} km</span>}</div>
              <input type="range" min="0" max={algo.steps.length - 1} value={stepIdx ?? 0} onChange={e => setStepIdx(+e.target.value)} aria-label={t.steps} className="mt-s" />
              <p className="muted">{t.stepHint}</p>
            </section>
          )}
        </div>

        <aside className="side stack">
          <section className="card">
            <b>{t.vs}</b>
            <div className="grid2 mt">
              <div className="score-box tp"><div className="kpi-l">{t.you}</div><div className="kpi-v">{num(userKm, 1)} km</div><div className="muted">{done ? t.min(Math.round(userKm * 3.6)) : "…"}</div></div>
              <div className="score-box fp"><div className="kpi-l">{t.ai}</div><div className="kpi-v">{done ? num(aiKm, 1) + " km" : "?"}</div><div className="muted">{done ? t.min(Math.round(aiKm * 3.6)) : t.hidden}</div></div>
            </div>
            {done && <p className="strong mt">{overhead <= 0 ? t.equal : t.longer(overhead)}</p>}
          </section>
          <Why tone={tone} title={wt}>{wx}</Why>
          {done && (
            <section className="card">
              <b>{t.algos}</b>
              <div className="algo-list mt-s">
                <div><span><b>{t.nn}</b><small>{t.nnD}</small></span><b>{num(algo.nnLen * KM, 1)} km</b></div>
                <div><span><b>{t.opt}</b><small>{t.optD}</small></span><b>{num(algo.optLen * KM, 1)} km</b></div>
                <div><span><b>{t.exact}</b><small>{algo.exact ? t.exactD(num(algo.exact.checked)) + " · " + t.ms(num(algo.msExact)) : t.exactNo(num(factorial(level)))}</small></span><b>{algo.exact ? num(algo.exact.len * KM, 1) + " km" : "–"}</b></div>
              </div>
            </section>
          )}
          <section className="card">
            <b>{t.count}</b>
            <div className="stack-s mt">
              {[5, 8, 12, 20].map(n => <div key={n} className={"row between" + (n === level ? " strong" : "")}><span>{t.stops(n)}</span><span>{num(factorial(n))}</span></div>)}
            </div>
            <p className="muted mt-s">{t.countHint}</p>
          </section>
        </aside>
      </div>
      <div className="stack mt-lg">
        <Tutor module="routes" ctx={{
          level, done, clicked: order.length, left: stops.length - order.length, overhead, cross,
          userKm, aiKm, exact: level <= 8
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
