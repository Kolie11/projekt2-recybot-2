import { useRef, useState } from "react";
import { Tutor } from "../ai/TutorContext.jsx";
import { Litter } from "../components/Litter.jsx";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { matchBoxes } from "../logic/metrics.js";
import { KNN } from "../logic/knn.js";
import { getEmbedder } from "../ml/embed.js";
import { cropRect, svgElementToCanvas } from "../ml/render.js";

const CLASSES = ["pet", "glass", "metal", "paper", "composite", "plastic"];
const W = 800, H = 450;

const SCENES = [
  [{ type: "pet", cls: "pet", x: 110, y: 150, w: 60, h: 170, hint: "01 PET", name: "bottle" },
   { type: "box", cls: "paper", x: 260, y: 230, w: 130, h: 100, hint: "PAP 20", name: "box" },
   { type: "can", cls: "metal", x: 470, y: 220, w: 62, h: 105, hint: "ALU 41", name: "can" },
   { type: "carton", cls: "composite", x: 610, y: 170, w: 75, h: 150, hint: "C/PAP 81", name: "juice" }],
  [{ type: "glass", cls: "glass", x: 100, y: 140, w: 58, h: 180, hint: "GL 70", name: "glass" },
   { type: "petCrushed", cls: "pet", x: 230, y: 270, w: 140, h: 60, hint: "01 PET", name: "crushed" },
   { type: "cup", cls: "plastic", x: 450, y: 250, w: 75, h: 80, hint: "06 PS", name: "cup" },
   { type: "box", cls: "paper", x: 590, y: 215, w: 140, h: 115, hint: "PAP 20", name: "parcel" }],
  [{ type: "pet", cls: "pet", x: 100, y: 150, w: 58, h: 175, color: "#5E8C4A", hint: "01 PET", name: "greenPet" },
   { type: "glass", cls: "glass", x: 250, y: 150, w: 58, h: 175, hint: "GL 70", name: "greenGlass" },
   { type: "carton", cls: "composite", x: 400, y: 180, w: 75, h: 145, color: "#D7372F", hint: "C/PAP 84", name: "milk" },
   { type: "canCrushed", cls: "metal", x: 560, y: 270, w: 95, h: 55, hint: "FE 40", name: "tin" }]
];

// Neue, unbekannte Verpackungen: Damit wird die trainierte KI geprüft.
const SIZE = { pet: [60, 170], petCrushed: [140, 60], glass: [58, 175], can: [62, 105], canCrushed: [95, 55], box: [130, 100], carton: [75, 150], cup: [75, 80] };
const TEST = [
  ["pet", "pet", "#B8E0F5"], ["pet", "pet", "#7FB069"], ["petCrushed", "pet", "#CDE8F7"],
  ["glass", "glass"], ["glass", "glass", "#8B5A2B"], ["can", "metal", "#1D4ED8"],
  ["canCrushed", "metal", "#16A34A"], ["box", "paper"], ["carton", "composite", "#F59E0B"],
  ["carton", "composite", "#1D4ED8"], ["cup", "plastic", "#EC4899"], ["cup", "plastic"]
].map(([type, cls, color], i) => {
  const [w, h] = SIZE[type];
  return { id: i, type, cls, color, w, h, x: (300 - w) / 2, y: 250 - h };
});

function Conveyor({ w, h }) {
  return (
    <g>
      <rect width={w} height={h} fill="#2B3A31" />
      <polygon points={`0,${h * 0.73} ${w},${h * 0.67} ${w},${h * 0.85} 0,${h * 0.93}`} fill="#3F5246" />
    </g>
  );
}
const SceneSvg = ({ items, w = W, h = H }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
    <Conveyor w={w} h={h} />
    {items.map((it, i) => <Litter key={i} {...it} />)}
  </svg>
);

const TEXT = {
  de: {
    eyebrow: "Modul 1 · LabelLab", title: "Du bringst der Sortier-KI das Sehen bei",
    lead: "Zieh einen Rahmen um jede Verpackung und sag, woraus sie ist. Danach trainierst du mit genau diesen Labels eine echte KI und prüfst sie an Verpackungen, die sie noch nie gesehen hat.",
    band: "Band", cls: { pet: "PET", glass: "Glas", metal: "Alu / Metall", paper: "Papier / Pappe", composite: "Verbundstoff", plastic: "Anderer Kunststoff" },
    toolBox: "Rahmen ziehen", toolLens: "Lupe", undo: "Rückgängig",
    hintBox: "Mit gedrückter Maustaste einen Rahmen ziehen. Einen Rahmen anklicken, um das Material zu ändern.",
    hintLens: "Fahr mit der Lupe über eine Verpackung. Der aufgedruckte Recycling-Code verrät das Material.",
    kbd: "Ohne Maus:", kbdItem: n => `Rahmen um Objekt ${n}`,
    pick: "Material für den markierten Rahmen", pickFirst: "Erst einen Rahmen ziehen oder anklicken",
    remove: "Rahmen löschen", missing: "Jeder Rahmen braucht ein Material",
    check: n => `Band prüfen (${n} Labels)`, nextBand: "Nächstes Band", toTraining: "Weiter: KI trainieren",
    perfect: "Alles richtig gelabelt.", score: (a, b) => `${a} von ${b} richtig`,
    extra: n => `${n} Rahmen ohne passende Verpackung.`,
    why: {
      compositeAsPaper: "Getränkekartons sehen aus wie Pappe. Innen sind sie aber mit Kunststoff und Alufolie beschichtet. Das ist Verbundstoff.",
      petAsGlass: "Die grüne Flasche ist aus PET, nicht aus Glas. Die Lupe zeigt den Code 01.",
      glassAsPet: "Diese Flasche ist aus Glas. Die Farbe sagt nichts über das Material.",
      plasticAsPet: "Joghurtbecher sind meist aus Polystyrol (Code 06). Im PET-Strom stören sie.",
      crushed: "Auch eine zerdrückte Flasche bleibt eine PET-Flasche.",
      missed: "Eine Verpackung hat keinen Rahmen bekommen oder der Rahmen sitzt zu ungenau.",
      generic: (a, b) => `Das ist ${a}, nicht ${b}.`
    },
    labelAcc: "Label-Genauigkeit",
    trainTitle: "Jetzt lernt die KI aus deinen Labels",
    trainLead: "Die KI bekommt die Ausschnitte deiner Rahmen zusammen mit deinen Labels. Danach muss sie 12 neue Verpackungen erkennen.",
    trainBtn: "KI trainieren und testen", trainErr: "Beim Trainieren ist ein Fehler aufgetreten. Bitte noch einmal versuchen.",
    stages: ["KI-Modell laden", "Deine Beispiele in Zahlen übersetzen", "Vergleichs-KI mit fehlerfreien Labels anlernen", "12 neue Verpackungen testen"],
    yours: "Deine KI", clean: "KI mit fehlerfreien Labels", correct: (a, b) => `${a} von ${b} neuen Verpackungen richtig`,
    gridTitle: "So hat deine KI die neuen Verpackungen eingeordnet",
    truth: "richtig wäre", nearest: "ähnlichstes Trainingsbeispiel",
    inherited: (cls) => `Hier hat die KI deinen Fehler übernommen: Das ähnlichste Beispiel hattest du als „${cls}“ gelabelt.`,
    resultGood: "Deine Labels waren sauber. Deshalb kann die KI fast so gut sortieren wie mit perfekten Daten.",
    resultBad: (d) => `Deine KI liegt ${d} Prozentpunkte hinter der Vergleichs-KI. Der Unterschied kommt allein aus den Labels: gleiches Verfahren, gleiche Bilder.`,
    restart: "Nochmal von vorn", features: { mobilenet: "Bildmerkmale: MobileNet (1280 Zahlen pro Bild)", simple: "Bildmerkmale: Farbe, Helligkeit, Kanten (offline)" },
    merk: "Eine KI lernt genau das, was in ihren Trainingsdaten steht, auch die Fehler. Wie sauber die Labels sind, entscheidet deshalb, wie gut die KI später sortiert.",
    concept: [
      { h: "Überwachtes Lernen", p: "Die KI bekommt Beispiele mit der richtigen Antwort, den Labels. Aus diesen Paaren lernt sie, neue Bilder einzuordnen. Ohne Labels wüsste sie nicht, was „richtig“ ist." },
      { h: "Vom Bild zur Zahlenliste", p: "Ein Computer kann Bilder nicht direkt vergleichen. Deshalb übersetzt ein vortrainiertes Netz (MobileNet) jeden Bildausschnitt in 1280 Zahlen, ein sogenanntes Embedding. Ähnlich aussehende Verpackungen bekommen ähnliche Zahlen." },
      { h: "Der Lernalgorithmus: Nächster Nachbar", p: "Deine KI speichert jedes deiner Beispiele. Kommt eine neue Verpackung, sucht sie das ähnlichste gespeicherte Beispiel und übernimmt dessen Label. Ist dieses Label falsch, ist auch die Antwort falsch. Genau das siehst du im Ergebnis." },
      { h: "Data Cascades", p: "Sambasivan et al. (2021) haben 53 KI-Fachleute befragt. Ihr Ergebnis: Kleine Datenfehler am Anfang verstärken sich durch alle späteren Schritte. In RecyBot sieht man das im Capstone wieder." }
    ],
    terms: [["Label", "die richtige Antwort zu einem Beispiel"], ["Embedding", "Bild als Zahlenliste"], ["Testdaten", "neue Beispiele, die die KI beim Lernen nicht gesehen hat"]]
  },
  en: {
    eyebrow: "Module 1 · LabelLab", title: "You teach the sorting AI to see",
    lead: "Draw a box around each package and say what it is made of. Then you train a real AI with exactly these labels and test it on packages it has never seen.",
    band: "Belt", cls: { pet: "PET", glass: "Glass", metal: "Aluminium / metal", paper: "Paper / cardboard", composite: "Composite", plastic: "Other plastic" },
    toolBox: "Draw box", toolLens: "Magnifier", undo: "Undo",
    hintBox: "Hold the mouse button and drag to draw a box. Click a box to change its material.",
    hintLens: "Move the magnifier over a package. The printed recycling code gives the material away.",
    kbd: "Without a mouse:", kbdItem: n => `Box around item ${n}`,
    pick: "Material for the selected box", pickFirst: "Draw or click a box first",
    remove: "Delete box", missing: "Every box needs a material",
    check: n => `Check belt (${n} labels)`, nextBand: "Next belt", toTraining: "Next: train the AI",
    perfect: "Everything labelled correctly.", score: (a, b) => `${a} of ${b} correct`,
    extra: n => `${n} box(es) without a matching package.`,
    why: {
      compositeAsPaper: "Drink cartons look like cardboard, but inside they are coated with plastic and aluminium foil. That makes them composite.",
      petAsGlass: "The green bottle is PET, not glass. The magnifier shows code 01.",
      glassAsPet: "This bottle is glass. Colour tells you nothing about the material.",
      plasticAsPet: "Yoghurt pots are usually polystyrene (code 06). They contaminate the PET stream.",
      crushed: "A crushed bottle is still a PET bottle.",
      missed: "One package has no box, or the box is too loose.",
      generic: (a, b) => `This is ${a}, not ${b}.`
    },
    labelAcc: "Label accuracy",
    trainTitle: "Now the AI learns from your labels",
    trainLead: "The AI gets the image crops from your boxes together with your labels. Then it has to recognise 12 new packages.",
    trainBtn: "Train and test the AI", trainErr: "Something went wrong while training. Please try again.",
    stages: ["Loading the AI model", "Turning your examples into numbers", "Training a comparison AI with flawless labels", "Testing 12 new packages"],
    yours: "Your AI", clean: "AI with flawless labels", correct: (a, b) => `${a} of ${b} new packages correct`,
    gridTitle: "How your AI sorted the new packages",
    truth: "should be", nearest: "most similar training example",
    inherited: (cls) => `Here the AI copied your mistake: you had labelled the most similar example as “${cls}”.`,
    resultGood: "Your labels were clean, so the AI sorts almost as well as with perfect data.",
    resultBad: (d) => `Your AI is ${d} percentage points behind the comparison AI. The gap comes only from the labels: same method, same images.`,
    restart: "Start over", features: { mobilenet: "Image features: MobileNet (1,280 numbers per image)", simple: "Image features: colour, brightness, edges (offline)" },
    merk: "An AI learns exactly what is in its training data, mistakes included. How clean the labels are therefore decides how well the AI sorts later.",
    concept: [
      { h: "Supervised learning", p: "The AI gets examples together with the right answer, the labels. From these pairs it learns to sort new images. Without labels it would not know what “right” means." },
      { h: "From image to a list of numbers", p: "A computer cannot compare pictures directly. So a pre-trained network (MobileNet) turns every image crop into 1,280 numbers, called an embedding. Packages that look alike get similar numbers." },
      { h: "The learning algorithm: nearest neighbour", p: "Your AI stores every one of your examples. When a new package comes along, it looks for the most similar stored example and copies its label. If that label is wrong, the answer is wrong too. That is exactly what you see in the result." },
      { h: "Data cascades", p: "Sambasivan et al. (2021) interviewed 53 AI practitioners. Their finding: small data errors at the start get amplified through every later step. In RecyBot you will see this again in the capstone." }
    ],
    terms: [["Label", "the right answer for an example"], ["Embedding", "an image as a list of numbers"], ["Test data", "new examples the AI did not see while learning"]]
  }
};

function explain(t, item, given) {
  if (!given) return t.why.missed;
  if (item.cls === "composite" && given === "paper") return t.why.compositeAsPaper;
  if (item.cls === "pet" && given === "glass") return t.why.petAsGlass;
  if (item.cls === "glass" && given === "pet") return t.why.glassAsPet;
  if (item.cls === "plastic" && given === "pet") return t.why.plasticAsPet;
  if (item.type === "petCrushed") return t.why.crushed;
  return t.why.generic(t.cls[item.cls], t.cls[given]);
}

export default function LabelLab({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const svgRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [allBoxes, setAllBoxes] = useState([[], [], []]);  // Rahmen je Band bleiben fürs Training erhalten
  const [drawing, setDrawing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tool, setTool] = useState("box");
  const [lens, setLens] = useState(null);
  const [checks, setChecks] = useState([null, null, null]);
  const [phase, setPhase] = useState("label"); // label | train | result
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState(null);
  const [trainError, setTrainError] = useState("");

  const items = SCENES[scene];
  const boxes = allBoxes[scene];
  const check = checks[scene];
  const setBoxes = fn => setAllBoxes(all => all.map((b, i) => (i === scene ? fn(b) : b)));

  const toSvg = e => {
    const svg = svgRef.current, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) };
  };
  const onDown = e => {
    if (check) return;
    if (tool === "lens") { setLens(toSvg(e)); return; }
    const p = toSvg(e);
    svgRef.current.setPointerCapture?.(e.pointerId);
    setDrawing({ x0: p.x, y0: p.y, x: p.x, y: p.y, w: 0, h: 0 });
    setSelected(null);
  };
  const onMove = e => {
    if (tool === "lens") { setLens(toSvg(e)); return; }
    if (!drawing) return;
    const p = toSvg(e);
    setDrawing(d => ({ ...d, x: Math.min(d.x0, p.x), y: Math.min(d.y0, p.y), w: Math.abs(p.x - d.x0), h: Math.abs(p.y - d.y0) }));
  };
  const addBox = b => {
    const id = "b" + Date.now() + Math.random().toString(36).slice(2, 6);
    setBoxes(list => [...list, { id, ...b, cls: null }]);
    setSelected(id);
  };
  const onUp = () => {
    if (!drawing) return;
    if (drawing.w > 14 && drawing.h > 14) addBox({ x: drawing.x, y: drawing.y, w: drawing.w, h: drawing.h });
    setDrawing(null);
  };
  const kbdBox = it => { if (!check) addBox({ x: it.x - 5, y: it.y - 5, w: it.w + 10, h: it.h + 10 }); };
  const setClass = cls => selected && setBoxes(list => list.map(x => (x.id === selected ? { ...x, cls } : x)));

  const runCheck = () => {
    const m = matchBoxes(items, boxes);
    setChecks(c => c.map((v, i) => (i === scene ? { ...m, correct: m.res.filter(r => r.status === "ok").length } : v)));
    setSelected(null);
  };

  const done = checks.filter(Boolean);
  const totals = done.reduce((a, c) => ({ correct: a.correct + c.correct, total: a.total + c.res.length }), { correct: 0, total: 0 });
  const labelAcc = totals.total ? totals.correct / totals.total : null;

  async function train() {
    setTrainError(""); setStage(0);
    try {
      const embedder = await getEmbedder();
      setStage(1);
      const mine = new KNN(1), clean = new KNN(1);
      for (let s = 0; s < SCENES.length; s++) {
        const canvas = await svgElementToCanvas(<SceneSvg items={SCENES[s]} />, W, H);
        for (const b of allBoxes[s].filter(x => x.cls)) {
          const truth = checks[s]?.res.find(r => r.box?.id === b.id)?.item.cls ?? null;
          mine.add(await embedder.embed(cropRect(canvas, b, W, 224)), b.cls, { scene: s, box: b, truth });
        }
        if (s === 0) setStage(2);
        for (const it of SCENES[s]) clean.add(await embedder.embed(cropRect(canvas, it, W, 224, 6)), it.cls, { scene: s, item: it });
      }
      setStage(3);
      const tests = [];
      for (const it of TEST) {
        const canvas = await svgElementToCanvas(<SceneSvg items={[it]} w={300} h={300} />, 300, 300);
        const vec = await embedder.embed(cropRect(canvas, it, 300, 224, 6));
        const a = mine.predict(vec), b = clean.predict(vec);
        tests.push({ item: it, mine: a.label, mineFrom: a.neighbours[0]?.meta, clean: b.label });
      }
      const mineAcc = tests.filter(x => x.mine === x.item.cls).length / tests.length;
      const cleanAcc = tests.filter(x => x.clean === x.item.cls).length / tests.length;
      setResult({ tests, mineAcc, cleanAcc, kind: embedder.kind, n: mine.size });
      setPhase("result");
      report({ acc: labelAcc ?? 0, aiAcc: mineAcc, cleanAcc });
    } catch (e) {
      console.error(e);
      setTrainError(e.message || String(e));
    } finally { setStage(-1); }
  }

  const restart = () => { setScene(0); setAllBoxes([[], [], []]); setChecks([null, null, null]); setPhase("label"); setResult(null); };

  const sel = boxes.find(b => b.id === selected);
  const errors = check ? check.res.filter(r => r.status !== "ok") : [];
  const lensItem = lens && items.find(it => lens.x >= it.x - 12 && lens.x <= it.x + it.w + 12 && lens.y >= it.y - 12 && lens.y <= it.y + it.h + 12);
  const accPct = labelAcc === null ? null : Math.round(labelAcc * 100);

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        {phase === "label" && <div className="pill-kpi"><span>{t.band}</span><b>{scene + 1} / 3</b></div>}
      </ModuleIntro>

      {phase === "label" && (
        <div className="split">
          <div className="main stack">
            <section className="card">
              <div className="row between">
                <div className="row" role="toolbar" aria-label="Tools">
                  <button className={tool === "box" ? "" : "secondary"} aria-pressed={tool === "box"} onClick={() => { setTool("box"); setLens(null); }}>{t.toolBox}</button>
                  <button className={tool === "lens" ? "" : "secondary"} aria-pressed={tool === "lens"} onClick={() => setTool("lens")}>{t.toolLens}</button>
                  <button className="secondary" onClick={() => setBoxes(b => b.slice(0, -1))} disabled={!boxes.length || !!check}>{t.undo}</button>
                </div>
              </div>
              <div className="stage mt">
                <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.lead}
                  style={{ cursor: check ? "default" : tool === "lens" ? "zoom-in" : "crosshair", touchAction: "none" }}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => tool === "lens" && setLens(null)}>
                  <Conveyor w={W} h={H} />
                  {items.map((it, i) => <Litter key={i} {...it} />)}
                  {boxes.map(b => {
                    const on = b.id === selected, col = b.cls ? "#7FD1A8" : "#F4B183", label = b.cls ? t.cls[b.cls] : "?";
                    return (
                      <g key={b.id} onPointerDown={e => { if (!check && tool === "box") { e.stopPropagation(); setSelected(b.id); } }} style={{ cursor: "pointer" }}>
                        <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={on ? "rgba(127,209,168,0.15)" : "transparent"} stroke={col} strokeWidth={on ? 4 : 3} strokeDasharray="8 5" />
                        <rect x={b.x} y={Math.max(0, b.y - 24)} width={label.length * 8 + 18} height="24" fill={col} />
                        <text x={b.x + 8} y={Math.max(0, b.y - 24) + 17} fontSize="14" fontWeight="700" fill="#142019">{label}</text>
                      </g>
                    );
                  })}
                  {drawing && <rect x={drawing.x} y={drawing.y} width={drawing.w} height={drawing.h} fill="rgba(255,255,255,0.1)" stroke="#fff" strokeWidth="2" strokeDasharray="6 4" />}
                  {check && check.res.map((r, i) => (
                    <rect key={"c" + i} x={r.item.x - 7} y={r.item.y - 7} width={r.item.w + 14} height={r.item.h + 14} fill="none"
                      stroke={r.status === "ok" ? "#7FD1A8" : r.status === "wrong" ? "#F4B183" : "#FF6B5B"} strokeWidth="4" />
                  ))}
                  {lens && (
                    <g pointerEvents="none">
                      <circle cx={lens.x} cy={lens.y} r="70" fill="rgba(255,255,255,0.08)" stroke="#fff" strokeWidth="4" />
                      <line x1={lens.x + 50} y1={lens.y + 50} x2={lens.x + 90} y2={lens.y + 90} stroke="#fff" strokeWidth="8" strokeLinecap="round" />
                      {lensItem && <g><rect x={lens.x - 60} y={lens.y - 104} width="120" height="30" rx="6" fill="#142019" /><text x={lens.x} y={lens.y - 83} textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">{lensItem.hint}</text></g>}
                    </g>
                  )}
                </svg>
              </div>
              <p className="muted mt-s">{tool === "lens" ? t.hintLens : t.hintBox}</p>
              {!check && (
                <div className="row kbd-row">
                  <span className="muted">{t.kbd}</span>
                  {items.map((it, i) => <button key={i} className="link" onClick={() => kbdBox(it)}>{t.kbdItem(i + 1)}</button>)}
                </div>
              )}
            </section>
          </div>

          <aside className="side stack">
            <section className="card">
              <b>{sel ? t.pick : t.pickFirst}</b>
              <div className="grid2 mt">
                {CLASSES.map(c => (
                  <button key={c} className={"opt" + (sel?.cls === c ? " on" : "")} disabled={!sel || !!check} onClick={() => setClass(c)}>{t.cls[c]}</button>
                ))}
              </div>
              {sel && !check && <button className="link mt-s" onClick={() => { setBoxes(b => b.filter(x => x.id !== selected)); setSelected(null); }}>{t.remove}</button>}
            </section>

            {!check ? (
              <button className="wide" onClick={runCheck} disabled={!boxes.length || boxes.some(b => !b.cls)}>
                {boxes.some(b => !b.cls) ? t.missing : t.check(boxes.length)}
              </button>
            ) : (
              <>
                <Why tone={errors.length ? "warn" : "ok"} title={errors.length ? t.score(check.correct, items.length) : t.perfect}>
                  {errors.length > 0 && <ul className="tight">{errors.map((r, i) => <li key={i}>{explain(t, r.item, r.box?.cls)}</li>)}</ul>}
                  {check.extra > 0 && <div>{t.extra(check.extra)}</div>}
                </Why>
                <button className="wide" onClick={() => (scene < 2 ? (setScene(scene + 1), setSelected(null)) : setPhase("train"))}>
                  {scene < 2 ? t.nextBand : t.toTraining}
                </button>
              </>
            )}

            <section className="card">
              <div className="row between"><b>{t.labelAcc}</b><span className="big-num">{accPct === null ? "–" : accPct + " %"}</span></div>
              <div className="track big mt-s"><div className="fill" style={{ width: (accPct || 0) + "%" }} /></div>
            </section>
          </aside>
        </div>
      )}

      {phase === "train" && (
        <section className="card mt-lg train-card">
          <h2 className="h-card">{t.trainTitle}</h2>
          <p className="lead" style={{ marginTop: 0 }}>{t.trainLead}</p>
          <div className="row mt">
            <div className="pill-kpi"><span>{t.labelAcc}</span><b>{accPct} %</b></div>
          </div>
          {stage >= 0 ? (
            <ol className="stages mt" aria-live="polite">
              {t.stages.map((s, i) => <li key={i} className={i < stage ? "done" : i === stage ? "now" : ""}>{i === stage && <span className="spinner" aria-hidden="true" />} {s}</li>)}
            </ol>
          ) : <button className="wide mt" onClick={train}>{t.trainBtn}</button>}
          {trainError && <div className="status warn mt" role="alert">{t.trainErr}</div>}
        </section>
      )}

      {phase === "result" && result && (
        <div className="stack mt-lg">
          <div className="grid2 big-compare">
            <div className={"res " + (result.mineAcc >= result.cleanAcc - 0.09 ? "good" : "bad")}>
              <div className="eyebrow">{t.yours}</div>
              <h2>{num(result.mineAcc * 100)} %</h2>
              <p>{t.correct(Math.round(result.mineAcc * 12), 12)}</p>
            </div>
            <div className="res good">
              <div className="eyebrow">{t.clean}</div>
              <h2>{num(result.cleanAcc * 100)} %</h2>
              <p>{t.correct(Math.round(result.cleanAcc * 12), 12)}</p>
            </div>
          </div>
          <Why tone={result.mineAcc >= result.cleanAcc - 0.09 ? "ok" : "warn"} title={result.mineAcc >= result.cleanAcc - 0.09 ? t.resultGood : t.resultBad(Math.round((result.cleanAcc - result.mineAcc) * 100))} />
          <section className="card">
            <div className="row between"><b>{t.gridTitle}</b><span className="muted">{t.features[result.kind]}</span></div>
            <div className="testgrid mt">
              {result.tests.map(r => {
                const ok = r.mine === r.item.cls;
                const inherited = !ok && r.mineFrom && r.mineFrom.truth !== r.mineFrom.box.cls;
                return (
                  <figure key={r.item.id} className={"test-item " + (ok ? "ok" : "bad")}>
                    <svg viewBox="0 0 300 300" aria-hidden="true"><Conveyor w={300} h={300} /><Litter {...r.item} /></svg>
                    <figcaption>
                      <b>{t.cls[r.mine] || "?"}</b>
                      {!ok && <span>{t.truth}: {t.cls[r.item.cls]}</span>}
                      {inherited && <small>{t.inherited(t.cls[r.mine])}</small>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
          <div className="row"><button className="secondary" onClick={restart}>{t.restart}</button></div>
        </div>
      )}

      <div className="stack mt-lg">
        <Tutor module="label" ctx={{
          scene, scenes: SCENES.length, phase, items: items.length, boxes: boxes.length, unlabeled: boxes.filter(b => !b.cls).length,
          checked: !!check, wrong: check ? check.res.filter(r => r.status === "wrong").length : 0, missed: check ? check.res.filter(r => r.status === "missed").length : 0,
          labelAcc, mineAcc: result ? result.mineAcc : null, cleanAcc: result ? result.cleanAcc : null
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
