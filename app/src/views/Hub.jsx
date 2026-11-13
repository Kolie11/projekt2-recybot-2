import { CONFIG } from "../config.js";
import { MODULES } from "../i18n/common.js";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { useRef } from "react";
import { Icon, Logo } from "../components/icons.jsx";
import { gsap, ScrollTrigger, useGSAP, MOTION_OK, EASE } from "../lib/motion.js";

const TEXT = {
  de: {
    eyebrow: "Ein Lernspiel zu KI und Kreislaufwirtschaft",
    title: <>Wie lernt eine Maschine, Müll zu <em>sortieren</em>, und was hat das mit deiner Stadt zu tun?</>,
    lead: "In neun kurzen Modulen trainierst du echte KI-Modelle, planst Sammeltouren, reparierst Handys und steuerst eine Stadt. Alles läuft direkt in deinem Browser. Was du entscheidest, taucht am Ende in deiner Kreislaufstadt wieder auf.",
    facts: ["9 Module", "ca. 90 Minuten", "keine Anmeldung", "Daten bleiben auf dem Gerät"],
    ctaPre: "Mit dem Vortest starten", ctaNext: m => `Weiter mit Modul ${m.n}: ${m.short}`, ctaPost: "Zum Nachtest", ctaReport: "Lernbericht ansehen",
    teacher: "Für Lehrkräfte",
    journey: "Dein Weg durch RecyBot",
    j: [
      ["Vortest", "12 Fragen · 5 Min."],
      ["Teil 1 · Einzelne Entscheidungen", "Module 1–4"],
      ["Teil 2 · Systeme und Zusammenhänge", "Module 5–9"],
      ["Nachtest und Lernbericht", "12 Fragen + Fragebogen · 10 Min."]
    ],
    stepDone: "erledigt", stepOpen: "offen", stepOf: (a, b) => `${a} von ${b}`,
    min: n => `${n} Min.`, start: "Starten", again: "Nochmal", done: "geschafft", next: "als Nächstes",
    realAi: "echte KI",
    phase1: "Teil 1 · Einzelne Entscheidungen", phase1s: "Wie lernt eine KI, wo macht sie Fehler, und wie entsteht ein gutes Produkt?",
    phase2: "Teil 2 · Systeme und Zusammenhänge", phase2s: "Wie hängen Routen, Politik, Daten und Energie zusammen?",
    cycle: "Kreislauf der Module", progress: (n) => `${n} von 9`, extForm: "Formular der Lehrkraft"
  },
  en: {
    eyebrow: "A learning game about AI and the circular economy",
    title: <>How does a machine learn to <em>sort</em> waste, and what does that have to do with your city?</>,
    lead: "In nine short modules you train real AI models, plan collection rounds, repair phones and run a city. Everything runs right in your browser. What you decide comes back at the end in your circular city.",
    facts: ["9 modules", "about 90 minutes", "no sign-up", "data stay on the device"],
    ctaPre: "Start with the pre-test", ctaNext: m => `Continue with module ${m.n}: ${m.short}`, ctaPost: "Go to the post-test", ctaReport: "View learning report",
    teacher: "For teachers",
    journey: "Your path through RecyBot",
    j: [
      ["Pre-test", "12 questions · 5 min"],
      ["Part 1 · Single decisions", "Modules 1–4"],
      ["Part 2 · Systems and connections", "Modules 5–9"],
      ["Post-test and learning report", "12 questions + survey · 10 min"]
    ],
    stepDone: "done", stepOpen: "open", stepOf: (a, b) => `${a} of ${b}`,
    min: n => `${n} min`, start: "Start", again: "Play again", done: "done", next: "up next",
    realAi: "real AI",
    phase1: "Part 1 · Single decisions", phase1s: "How does an AI learn, where does it go wrong, and what makes a good product?",
    phase2: "Part 2 · Systems and connections", phase2s: "How do routes, policy, data and energy fit together?",
    cycle: "The cycle of modules", progress: (n) => `${n} of 9`, extForm: "Teacher's form"
  }
};
const REAL_AI = new Set(["label", "line", "repair", "routes", "policy", "sprint", "green"]);

export default function Hub({ progress, study = {} }) {
  const t = useText(TEXT);
  const { pick } = useLang();
  const mods = MODULES.map(m => ({ ...m, short: pick(m.title).split(":")[0] }));
  const done = mods.filter(m => progress[m.view]).length;
  const next = mods.find(m => !progress[m.view]);

  let cta;
  if (!study.pre) cta = { href: "#vortest", label: t.ctaPre };
  else if (next) cta = { href: "#" + next.view, label: t.ctaNext(next) };
  else if (!study.post) cta = { href: "#nachtest", label: t.ctaPost };
  else cta = { href: "#bericht", label: t.ctaReport };

  const p1 = mods.filter(m => m.n <= 4), p2 = mods.filter(m => m.n >= 5);
  const cnt = arr => arr.filter(m => progress[m.view]).length;
  const steps = [
    { href: "#vortest", icon: "test", state: study.pre ? "done" : "open", sub: study.pre ? t.stepDone : t.j[0][1] },
    { href: "#label", icon: "label", state: cnt(p1) === 4 ? "done" : cnt(p1) ? "part" : "open", sub: `${t.j[1][1]} · ${t.stepOf(cnt(p1), 4)}` },
    { href: "#routes", icon: "routes", state: cnt(p2) === 5 ? "done" : cnt(p2) ? "part" : "open", sub: `${t.j[2][1]} · ${t.stepOf(cnt(p2), 5)}` },
    { href: study.post ? "#bericht" : "#nachtest", icon: "report", state: study.post && study.survey ? "done" : "open", sub: study.post ? t.stepDone : t.j[3][1] }
  ];

  const card = m => {
    const isDone = progress[m.view], isNext = next && m.n === next.n;
    return (
      <article key={m.n} className={"mod" + (isDone ? " done" : "") + (isNext ? " next" : "")}>
        <div className="mod-top">
          <span className="mod-icon"><Icon name={m.view} size={26} /></span>
          <span className="tags">
            {REAL_AI.has(m.view) && <span className="tag ai">{t.realAi}</span>}
            <span className="tag">{pick(m.tag)}</span>
          </span>
        </div>
        <div className="mod-n">{String(m.n).padStart(2, "0")} · {t.min(m.min)}</div>
        <h3>{pick(m.title)}</h3>
        <p>{pick(m.goal)}</p>
        <div className="mod-foot">
          {isDone ? <span className="mod-state ok"><Icon name="check" size={16} /> {t.done}</span>
            : isNext ? <span className="mod-state next">{t.next}</span> : <span />}
          <a className={"btn" + (isDone ? " secondary" : "")} href={"#" + m.view} aria-label={`${isDone ? t.again : t.start}: ${pick(m.title)}`}>{isDone ? t.again : t.start}</a>
        </div>
      </article>
    );
  };

  const root = useRef(null);
  // Einstieg: Text, dann der Kreislauf Knoten für Knoten. Karten erscheinen beim Scrollen.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.timeline({ defaults: { ease: EASE } })
        .from(".hero-text > *", { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.07 })
        .from(".cy-halo", { scale: 0.85, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.5 }, 0.15)
        .from(".cy-node", { scale: 0.5, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.05, ease: "back.out(1.6)" }, 0.3)
        .from(".cy-arc", { autoAlpha: 0, duration: 0.25, stagger: 0.05 }, 0.45);
      // Nur Deckkraft, nicht visibility: Karten bleiben per Tab erreichbar, auch bevor sie eingeblendet sind.
      gsap.set(".jstep, .mod", { opacity: 0, y: 16 });
      ScrollTrigger.batch(".jstep, .mod", {
        start: "top 92%", once: true,
        onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "power2.out", overwrite: true })
      });
    });
  }, { scope: root });

  return (
    <div className="hub" ref={root}>
      <section className="hero">
        <div className="hero-text">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 className="h-hero">{t.title}</h1>
          <p className="lead">{t.lead}</p>
          <div className="row mt-lg">
            <a className="btn tall cta" href={cta.href}>{cta.label}</a>
            <a className="btn tall secondary" href="#lehrkraft">{t.teacher}</a>
          </div>
          <ul className="facts">{t.facts.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
        <CycleMap mods={mods} progress={progress} next={next} label={t.cycle} center={t.progress(done)} />
      </section>

      <section aria-labelledby="journey">
        <h2 id="journey" className="phase">{t.journey}</h2>
        <ol className="journey">
          {steps.map((s, k) => (
            <li key={k} className={"jstep " + s.state}>
              <a href={s.href}>
                <span className="jnum">{s.state === "done" ? <Icon name="check" size={18} /> : k + 1}</span>
                <span><b>{t.j[k][0]}</b><small>{s.sub}</small></span>
              </a>
            </li>
          ))}
        </ol>
        {(CONFIG.VORTEST_URL || CONFIG.NACHTEST_URL) && (
          <p className="muted mt-s">{t.extForm}: {CONFIG.VORTEST_URL && <a href={CONFIG.VORTEST_URL} target="_blank" rel="noopener noreferrer">{t.j[0][0]}</a>}
            {CONFIG.VORTEST_URL && CONFIG.NACHTEST_URL && " · "}{CONFIG.NACHTEST_URL && <a href={CONFIG.NACHTEST_URL} target="_blank" rel="noopener noreferrer">{t.j[3][0]}</a>}</p>
        )}
      </section>

      <section aria-labelledby="p1">
        <div className="phase-head"><h2 id="p1" className="phase">{t.phase1}</h2><p className="muted">{t.phase1s}</p></div>
        <div className="grid">{p1.map(card)}</div>
      </section>
      <section aria-labelledby="p2">
        <div className="phase-head"><h2 id="p2" className="phase">{t.phase2}</h2><p className="muted">{t.phase2s}</p></div>
        <div className="grid">{p2.map(card)}</div>
      </section>
    </div>
  );
}

/** Die neun Module als Kreislauf. Erledigte Module leuchten, das nächste ist markiert. */
function CycleMap({ mods, progress, next, label, center }) {
  const C = 230, R = 150, N = mods.length;
  const pos = k => { const a = (-90 + k * (360 / N)) * Math.PI / 180; return [C + R * Math.cos(a), C + R * Math.sin(a), a]; };
  const arc = k => {
    const step = 360 / N, gap = 13;
    const a1 = (-90 + k * step + gap) * Math.PI / 180, a2 = (-90 + (k + 1) * step - gap) * Math.PI / 180;
    return `M${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)} A${R} ${R} 0 0 1 ${C + R * Math.cos(a2)} ${C + R * Math.sin(a2)}`;
  };
  return (
    <nav className="cycle" aria-label={label}>
      <svg viewBox="-80 10 620 440" role="presentation">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="currentColor" />
          </marker>
        </defs>
        <circle cx={C} cy={C} r={R + 44} className="cy-halo" />
        {mods.map((m, k) => (
          <path key={"a" + k} d={arc(k)} className={"cy-arc" + (progress[m.view] ? " on" : "")} markerEnd="url(#arr)" />
        ))}
        <Logo size={84} x={C - 42} y={C - 58} />
        <text x={C} y={C + 48} className="cy-center">{center}</text>
        {mods.map((m, k) => {
          const [x, y, a] = pos(k), isDone = progress[m.view], isNext = next && next.n === m.n;
          const lx = C + (R + 52) * Math.cos(a), ly = C + (R + 52) * Math.sin(a);
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          return (
            <a key={m.n} href={"#" + m.view} className={"cy-node" + (isDone ? " done" : "") + (isNext ? " next" : "")}>
              <title>{`${m.n}. ${m.short}`}</title>
              {isNext && <circle cx={x} cy={y} r="36" className="cy-pulse" />}
              <circle cx={x} cy={y} r="27" className="cy-dot" />
              <Icon name={m.view} size={24} x={x - 12} y={y - 12} />
              <text x={lx + (anchor === "start" ? -14 : anchor === "end" ? 14 : 0)} y={ly + (Math.sin(a) > 0.3 ? 10 : Math.sin(a) < -0.3 ? 0 : 5)} textAnchor={anchor} className="cy-label">
                <tspan className="cy-n">{m.n} </tspan>{m.short}
              </text>
            </a>
          );
        })}
      </svg>
    </nav>
  );
}
