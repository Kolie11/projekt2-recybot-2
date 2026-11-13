import { useMemo, useRef, useState } from "react";
import { Litter } from "../components/Litter.jsx";
import { Concept, Merksatz, ModuleIntro, Why } from "../components/ui.jsx";
import { Tutor } from "../ai/TutorContext.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { KNN } from "../logic/knn.js";
import { getEmbedder } from "../ml/embed.js";
import { cropRect, svgElementToCanvas } from "../ml/render.js";

const W = 640, H = 400, PATCH = 90;
const LOCS = ["city", "park", "edge", "forest"];
const mk = arr => arr.map(([type, x, y, w, h, color]) => ({ type, x, y, w, h, color }));
const BASE = [
  { loc: "city", key: "market", items: mk([["cup", 120, 300, 34, 36], ["can", 300, 320, 22, 36], ["butt", 450, 350, 26, 10], ["paper", 520, 280, 40, 30]]) },
  { loc: "city", key: "bus", items: mk([["pet", 200, 290, 22, 60], ["bag", 380, 300, 50, 46], ["butt", 110, 360, 26, 10]]) },
  { loc: "city", key: "street", items: mk([["box", 90, 300, 70, 50], ["can", 330, 330, 20, 34], ["cup", 500, 320, 30, 32], ["butt", 260, 370, 24, 9]]) },
  { loc: "park", key: "park", items: mk([["pet", 150, 280, 20, 56], ["paper", 330, 330, 36, 26], ["can", 480, 300, 20, 34], ["butt", 260, 350, 22, 9]]) },
  { loc: "edge", key: "field", items: mk([["bag", 160, 300, 50, 40], ["petCrushed", 390, 330, 50, 22], ["can", 520, 290, 18, 30]]) }
];
// Am Waldrand liegen Dinge, die keine Abfälle sind: Zapfen, Laub, Steine.
const dk = arr => arr.map(([kind, x, y]) => ({ kind, x, y }));
const EXTRA = [
  { loc: "forest", key: "forest", items: mk([["pet", 120, 300, 18, 50, "#5E8C4A"], ["can", 300, 330, 18, 30], ["bag", 470, 310, 46, 40], ["butt", 230, 360, 22, 9]]),
    decoys: dk([["cone", 380, 290], ["leaf", 560, 360], ["stone", 60, 370], ["leaf", 200, 270]]) },
  { loc: "forest", key: "parking", items: mk([["box", 140, 300, 60, 44], ["cup", 360, 320, 28, 30], ["petCrushed", 500, 340, 50, 22]]),
    decoys: dk([["cone", 270, 370], ["stone", 600, 300], ["leaf", 80, 260], ["cone", 440, 270]]) }
];
// Testfotos: Die KI hat sie nie gesehen. Je Ort eines.
const TESTS = [
  { loc: "city", items: mk([["can", 200, 320, 20, 34], ["cup", 420, 300, 30, 32], ["paper", 520, 330, 38, 28], ["butt", 120, 360, 24, 9]]) },
  { loc: "park", items: mk([["pet", 240, 300, 20, 56], ["can", 450, 330, 20, 34], ["bag", 100, 320, 48, 40]]) },
  { loc: "edge", items: mk([["can", 260, 310, 18, 30], ["paper", 430, 340, 36, 26], ["bag", 120, 330, 48, 40]]) },
  { loc: "forest", items: mk([["pet", 200, 320, 18, 50, "#5E8C4A"], ["can", 380, 340, 18, 30], ["paper", 520, 330, 36, 26], ["bag", 90, 320, 46, 40]]),
    decoys: dk([["cone", 300, 280], ["leaf", 450, 290], ["stone", 600, 370], ["cone", 160, 380]]) }
];

function Decoy({ kind, x, y }) {
  if (kind === "cone") return (<g><ellipse cx={x} cy={y} rx="11" ry="17" fill="#7A4E2D" /><path d={`M${x - 9} ${y - 6} h18 M${x - 10} ${y + 2} h20 M${x - 8} ${y + 10} h16`} stroke="#5A3820" strokeWidth="2" /></g>);
  if (kind === "leaf") return (<g><path d={`M${x - 18} ${y} Q${x} ${y - 16} ${x + 18} ${y} Q${x} ${y + 14} ${x - 18} ${y} Z`} fill="#D9822B" /><line x1={x - 16} y1={y} x2={x + 16} y2={y} stroke="#9A5A1B" strokeWidth="1.5" /></g>);
  return <ellipse cx={x} cy={y} rx="20" ry="12" fill="#9AA09A" stroke="#7D837D" strokeWidth="2" />;
}

function Background({ loc }) {
  if (loc === "city") return (<g>
    <rect width={W} height={H} fill="#BFC4BE" /><rect width={W} height="200" fill="#DCE7EE" />
    {[0, 130, 250, 400, 520].map((x, i) => <rect key={x} x={x} y={40 + (i % 2) * 30} width="110" height={170 - (i % 2) * 30} fill={i % 2 ? "#C9B8A3" : "#D9CBB8"} />)}
    {[0, 130, 250, 400, 520].map(x => [70, 120].map(y => <rect key={x + "-" + y} x={x + 20} y={y + 20} width="22" height="26" fill="#8FA6B5" />))}
    <rect y="210" width={W} height="10" fill="#9DA39C" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <line key={i} x1={i * 90} y1="220" x2={i * 90 - 40} y2={H} stroke="#AEB3AD" strokeWidth="2" />)}
  </g>);
  if (loc === "park") return (<g>
    <rect width={W} height={H} fill="#A9CF8F" /><rect width={W} height="140" fill="#CFE6F2" />
    <circle cx="90" cy="120" r="70" fill="#5E8C4A" /><circle cx="180" cy="100" r="55" fill="#6E9D58" /><circle cx="540" cy="110" r="75" fill="#5E8C4A" />
    <path d="M260 400 L320 150 L360 150 L470 400 Z" fill="#E3D6BC" />
  </g>);
  if (loc === "edge") return (<g>
    <rect width={W} height={H} fill="#C9D48F" /><rect width={W} height="170" fill="#DCE7EE" />
    <path d="M0 170 Q320 140 640 175 V200 H0 Z" fill="#9DB86A" />
    {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 56} y="190" width="6" height="60" fill="#8B6B45" />)}
    <rect y="205" width={W} height="4" fill="#8B6B45" /><path d="M200 400 L300 210 L340 210 L420 400 Z" fill="#D8C9A5" />
  </g>);
  return (<g>
    <rect width={W} height={H} fill="#6F8F55" /><rect width={W} height="120" fill="#CFE0DA" />
    {[30, 110, 190, 280, 370, 460, 550, 620].map((x, i) => <g key={x}><rect x={x - 6} y="120" width="12" height="110" fill="#5B4632" /><circle cx={x} cy={110 - (i % 3) * 15} r="48" fill={i % 2 ? "#3E6B35" : "#4E7F42"} /></g>)}
    <rect y="230" width={W} height="170" fill="#7D9B5F" />
    {[40, 150, 260, 380, 500, 600].map((x, i) => <ellipse key={x} cx={x} cy={300 + (i % 2) * 50} rx="26" ry="9" fill="#5E7F45" />)}
  </g>);
}
const Scene = ({ photo }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}><Background loc={photo.loc} />{(photo.decoys || []).map((d, i) => <Decoy key={"d" + i} {...d} />)}{photo.items.map((it, i) => <Litter key={i} {...it} />)}</svg>
);
const center = it => [it.x + it.w / 2, it.y + it.h / 2];
const patchAt = ([cx, cy]) => ({ x: cx - PATCH / 2, y: cy - PATCH / 2, w: PATCH, h: PATCH });
/** Bodenstellen ohne Müll: zuerst Naturdinge (Zapfen, Laub, Steine), dann freie Flächen. */
function groundPoints(photo, n) {
  const out = (photo.decoys || []).map(d => [d.x, d.y]).slice(0, n);
  const taken = [...photo.items.map(center), ...out];
  for (let y = 265; y <= 375 && out.length < n; y += 55)
    for (let x = 60; x <= 590 && out.length < n; x += 75)
      if (taken.every(([cx, cy]) => Math.hypot(cx - x, cy - y) > 70)) { out.push([x, y]); taken.push([x, y]); }
  return out;
}

const TEXT = {
  de: {
    eyebrow: "Modul 7 · Data Sprint", title: "Gemeinsam Müll in der Stadt kartieren",
    lead: "Eure Klasse markiert Müll auf Fotos aus der Stadt. Damit trainiert ihr eine KI, die später selbst Müll findet. Die Frage ist: Zeigen eure Fotos wirklich die ganze Stadt?",
    loc: { city: "Innenstadt", park: "Parks", edge: "Stadtrand", forest: "Waldrand" },
    photo: { market: "Marktplatz", bus: "Bushaltestelle", street: "Fußgängerzone", park: "Stadtpark", field: "Feldweg", forest: "Waldweg", parking: "Waldparkplatz" },
    photoOf: (a, b, n, l) => `Foto ${a} von ${b} · ${n} (${l})`, allDone: "Alle Fotos markiert",
    board: "Team-Rangliste", gold: "Goldstandard einblenden",
    hint: "Klick jedes Müllteil an, auch kleine wie Zigarettenstummel. Ein zweiter Klick nimmt die Markierung zurück.",
    compare: "Mit Goldstandard vergleichen", nextPhoto: "Nächstes Foto", clear: "Markierungen löschen",
    missed: "übersehen", legend: ["eure Markierung", "Goldstandard", "Abweichung"],
    dev: "Abweichung vom Goldstandard", labelled: (a, b) => `${a} von ${b} Fotos markiert`,
    where: "Woher kommen eure Fotos?",
    trainTitle: "Jetzt lernt die KI aus euren Markierungen", trainLead: "Für jede Markierung schneidet die KI einen Bildausschnitt aus und lernt: Das ist Müll. Ausschnitte ohne Markierung lernt sie als Boden. Danach sucht sie Müll auf vier neuen Fotos, eines von jedem Ort.",
    trainBtn: "KI trainieren und an neuen Fotos testen", retrainBtn: "KI neu trainieren", trainErr: "Beim Trainieren ist ein Fehler aufgetreten. Bitte noch einmal versuchen.",
    stages: ["KI-Modell laden", "Bildausschnitte aus euren Fotos lernen", "Vier neue Fotos durchsuchen"],
    testTitle: "Wie zuverlässig ist eure KI auf neuen Fotos?", detail: (r, f) => `${r} % des Mülls gefunden · ${f} % Fehlalarme auf Boden ohne Müll`,
    scoreHint: "Zuverlässigkeit = Mittelwert aus gefundenem Müll und Boden, der richtig als Boden erkannt wurde. Der schwarze Strich zeigt den Wert vor dem Ergänzen.",
    samples: (p, n) => `${p} Müll-Beispiele, ${n} Boden-Beispiele gelernt`,
    addPhotos: "Fotos vom Waldrand ergänzen",
    why: {
      label: ["Finde allen Müll auf dem Foto", "Danach vergleicht ihr eure Markierungen mit dem Goldstandard, also mit Fotos, die Fachleute geprüft haben."],
      perfect: ["Genau wie der Goldstandard", "Alles gefunden und nichts Falsches markiert."],
      dev: (d, m, f) => [`${d} % Abweichung`, `${m ? m + " Teil(e) übersehen" : ""}${m && f ? ", " : ""}${f ? f + "-mal etwas markiert, das kein Müll ist" : ""}. In Bürgerdaten werden kleine Teile besonders oft übersehen.`],
      train: ["Alle Fotos sind markiert", "Jetzt trainiert ihr mit euren Markierungen eine echte KI."],
      bias: (r, f, c, w) => [`Am Waldrand ist die KI nur zu ${w} % zuverlässig (Innenstadt: ${c} %)`, `Sie findet dort ${r} % des Mülls, hält aber ${f} % der Zapfen, Blätter und Steine für Müll. Den Waldboden hat sie nie gesehen, weil fast alle Trainingsfotos aus der Stadt stammen. Das ist Bias.`],
      better: (a, b) => [`Waldrand: von ${a} % auf ${b} %`, "Jetzt kennt die KI Zapfen und Laub als Boden. Ein vielfältiger Datensatz macht die KI für alle Orte brauchbar."],
      same: ["Kaum Veränderung am Waldrand", "Die neuen Fotos haben diesmal wenig geändert. Mit mehr Waldfotos würde der Effekt deutlicher."],
      noBias: ["Diesmal kaum Unterschiede zwischen den Orten", "Schau trotzdem auf die Verteilung der Fotos: Ein Ort mit 0 % im Datensatz bleibt ein Risiko."]
    },
    teams: ["Team Blau", "Team Gelb", "Team Rot"], teamNote: "Punkte = 100 minus Abweichung. Gemeinsam besser werden zählt mehr als gewinnen.", you: "Team Grün (ihr)", pts: "Punkte",
    merk: "Wenn die Daten nur einen Teil der Welt zeigen, ist auch die KI einseitig. Gute Datensätze sind vielfältig und werden gegen einen Goldstandard geprüft.",
    concept: [
      { h: "Citizen Science", p: "Bei Citizen-Science-Projekten sammeln Bürgerinnen und Bürger Daten, zum Beispiel Fotos von Müll. Das bringt sehr viele Daten, aber ihre Qualität schwankt stark (Haklay, 2013). Darum vergleicht man sie mit einem Goldstandard." },
      { h: "Der Goldstandard", p: "Ein kleiner Teil der Daten wird von Fachleuten sorgfältig geprüft. Weicht eine Markierung davon ab, sieht man sofort, wo es hakt. Diese genaue Rückmeldung hilft beim Lernen mehr als ein bloßes richtig oder falsch (Hattie & Timperley, 2007)." },
      { h: "Was die KI hier wirklich macht", p: "Für jede eurer Markierungen schneidet die KI ein Quadrat aus dem Foto aus, übersetzt es mit MobileNet in Zahlen und speichert es als Beispiel für „Müll“. Quadrate ohne Markierung werden Beispiele für „Boden“. Bei einem neuen Foto vergleicht sie jedes Quadrat mit den drei ähnlichsten Beispielen und stimmt ab." },
      { h: "Sampling Bias", p: "Fehlt ein Ort im Datensatz, kennt die KI seinen Untergrund nicht. Sie verwechselt dann Müll mit Boden. Die KI ist dabei nicht „böse“: Sie kann nur wiedergeben, was in den Daten steckt. Darum sind vielfältige Daten eine Frage der Fairness." }
    ],
    terms: [["Goldstandard", "von Fachleuten geprüfte Daten"], ["Bias", "Verzerrung durch einseitige Daten"], ["Recall pro Ort", "Anteil gefundenen Mülls je Ort"]]
  },
  en: {
    eyebrow: "Module 7 · Data Sprint", title: "Mapping litter in the city together",
    lead: "Your class tags litter on photos from around town. With these tags you train an AI that will find litter by itself. The question is: do your photos really show the whole city?",
    loc: { city: "City centre", park: "Parks", edge: "Outskirts", forest: "Forest edge" },
    photo: { market: "Market square", bus: "Bus stop", street: "High street", park: "City park", field: "Field path", forest: "Forest path", parking: "Forest car park" },
    photoOf: (a, b, n, l) => `Photo ${a} of ${b} · ${n} (${l})`, allDone: "All photos tagged",
    board: "Team leaderboard", gold: "Show gold standard",
    hint: "Click every piece of litter, including small ones like cigarette butts. A second click removes the tag.",
    compare: "Compare with gold standard", nextPhoto: "Next photo", clear: "Clear tags",
    missed: "missed", legend: ["your tag", "gold standard", "difference"],
    dev: "Deviation from gold standard", labelled: (a, b) => `${a} of ${b} photos tagged`,
    where: "Where do your photos come from?",
    trainTitle: "Now the AI learns from your tags", trainLead: "For every tag the AI cuts out an image patch and learns: this is litter. Patches without a tag become examples of ground. Then it searches for litter on four new photos, one from each place.",
    trainBtn: "Train the AI and test it on new photos", retrainBtn: "Retrain the AI", trainErr: "Something went wrong while training. Please try again.",
    stages: ["Loading the AI model", "Learning image patches from your photos", "Searching four new photos"],
    testTitle: "How reliable is your AI on new photos?", detail: (r, f) => `${r} % of the litter found · ${f} % false alarms on clean ground`,
    scoreHint: "Reliability = average of litter found and clean ground correctly recognised as ground. The black mark shows the value before adding photos.",
    samples: (p, n) => `learned ${p} litter examples and ${n} ground examples`,
    addPhotos: "Add photos from the forest edge",
    why: {
      label: ["Find all the litter in the photo", "Then you compare your tags with the gold standard, photos checked by experts."],
      perfect: ["Exactly like the gold standard", "Everything found and nothing wrong tagged."],
      dev: (d, m, f) => [`${d} % deviation`, `${m ? m + " item(s) missed" : ""}${m && f ? ", " : ""}${f ? f + " tag(s) on something that isn't litter" : ""}. Small items are missed especially often in citizen data.`],
      train: ["All photos are tagged", "Now you train a real AI with your tags."],
      bias: (r, f, c, w) => [`At the forest edge the AI is only ${w} % reliable (city centre: ${c} %)`, `It finds ${r} % of the litter there but takes ${f} % of the cones, leaves and stones for litter. It has never seen the forest floor because almost all training photos come from town. That is bias.`],
      better: (a, b) => [`Forest edge: from ${a} % to ${b} %`, "Now the AI knows cones and leaves as ground. A varied dataset makes the AI useful everywhere."],
      same: ["Little change at the forest edge", "The new photos changed little this time. More forest photos would make the effect clearer."],
      noBias: ["Little difference between places this time", "Still, look at where the photos come from: a place with 0 % in the dataset remains a risk."]
    },
    teams: ["Team Blue", "Team Yellow", "Team Red"], teamNote: "Points = 100 minus deviation. Getting better together matters more than winning.", you: "Team Green (you)", pts: "points",
    merk: "If the data only show part of the world, the AI is one-sided too. Good datasets are varied and checked against a gold standard.",
    concept: [
      { h: "Citizen science", p: "In citizen science projects, members of the public collect data, for example photos of litter. That produces a lot of data, but its quality varies a great deal (Haklay, 2013). That is why it is compared with a gold standard." },
      { h: "The gold standard", p: "A small part of the data is carefully checked by experts. If a tag differs from it, you see straight away where things go wrong. This precise feedback helps learning more than a bare right or wrong (Hattie & Timperley, 2007)." },
      { h: "What the AI really does here", p: "For each of your tags, the AI cuts a square out of the photo, turns it into numbers with MobileNet and stores it as an example of “litter”. Squares without a tag become examples of “ground”. On a new photo it compares every square with the three most similar examples and takes a vote." },
      { h: "Sampling bias", p: "If a place is missing from the dataset, the AI does not know its ground and confuses litter with ground. The AI is not being “unfair” on purpose: it can only reproduce what is in the data. That is why varied data is a question of fairness." }
    ],
    terms: [["Gold standard", "data checked by experts"], ["Bias", "distortion caused by one-sided data"], ["Recall per place", "share of litter found at each place"]]
  }
};

export default function DataSprint({ report }) {
  const t = useText(TEXT);
  const { num } = useLang();
  const svgRef = useRef(null);
  const [extended, setExtended] = useState(false);
  const photos = useMemo(() => (extended ? [...BASE, ...EXTRA] : BASE), [extended]);
  const [idx, setIdx] = useState(0);
  const [marks, setMarks] = useState({});
  const [falses, setFalses] = useState([]);
  const [checked, setChecked] = useState(null);
  const [labels, setLabels] = useState([]); // je Foto: {found:Set, falses:[], dev}
  const [board, setBoard] = useState(false);
  const [showGold, setShowGold] = useState(true);
  const [stage, setStage] = useState(-1);
  const [ai, setAi] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [err, setErr] = useState("");

  const photo = photos[Math.min(idx, photos.length - 1)];
  const allDone = labels.length >= photos.length;

  const toSvg = e => { const s = svgRef.current, p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(s.getScreenCTM().inverse()); };
  const clickItem = (i, e) => { e.stopPropagation(); if (!checked && !allDone) setMarks(m => ({ ...m, [i]: !m[i] })); };
  const clickBg = e => { if (checked || allDone) return; const p = toSvg(e); setFalses(f => [...f, { x: p.x, y: p.y }]); };
  const removeFalse = (k, e) => { e.stopPropagation(); if (!checked) setFalses(f => f.filter((_, j) => j !== k)); };

  const compare = () => {
    const found = photo.items.map((_, i) => i).filter(i => marks[i]);
    const missed = photo.items.length - found.length;
    const dev = Math.round(((missed + falses.length) / photo.items.length) * 100);
    setChecked({ missed, falses: falses.length, dev });
    setLabels(l => [...l, { found, falses: [...falses], dev }]);
  };
  const next = () => { setIdx(i => i + 1); setMarks({}); setFalses([]); setChecked(null); };
  const addPhotos = () => { setExtended(true); setIdx(BASE.length); setMarks({}); setFalses([]); setChecked(null); };

  async function trainAndTest() {
    setErr(""); setStage(0);
    try {
      const emb = await getEmbedder();
      setStage(1);
      const knn = new KNN(3);
      let pos = 0, neg = 0;
      for (let p = 0; p < photos.length; p++) {
        const canvas = await svgElementToCanvas(<Scene photo={photos[p]} />, W, H);
        const lab = labels[p];
        for (const i of lab.found) { knn.add(await emb.embed(cropRect(canvas, patchAt(center(photos[p].items[i])), W, 224)), "litter"); pos++; }
        for (const f of lab.falses) { knn.add(await emb.embed(cropRect(canvas, patchAt([f.x, f.y]), W, 224)), "litter"); pos++; }
        for (const g of groundPoints(photos[p], 6)) { knn.add(await emb.embed(cropRect(canvas, patchAt(g), W, 224)), "ground"); neg++; }
      }
      setStage(2);
      const rates = {};
      for (const tp of TESTS) {
        const canvas = await svgElementToCanvas(<Scene photo={tp} />, W, H);
        let hit = 0, fa = 0;
        for (const it of tp.items) if (knn.predict(await emb.embed(cropRect(canvas, patchAt(center(it)), W, 224))).label === "litter") hit++;
        const ground = groundPoints(tp, 4);
        for (const g of ground) if (knn.predict(await emb.embed(cropRect(canvas, patchAt(g), W, 224))).label === "litter") fa++;
        const rate = Math.round((hit / tp.items.length) * 100), faRate = Math.round((fa / ground.length) * 100);
        rates[tp.loc] = { rate, fa: faRate, score: Math.round((rate + 100 - faRate) / 2) };
      }
      const res = { rates, pos, neg, kind: emb.kind, extended };
      setAi(res); setAiHistory(h => [...h, res]);
      const avgDev = Math.round(labels.reduce((a, l) => a + l.dev, 0) / labels.length);
      report({ dev: avgDev, diversified: extended, forest: rates.forest.score, city: rates.city.score });
    } catch (e) { console.error(e); setErr(e.message || String(e)); }
    finally { setStage(-1); }
  }

  const comp = LOCS.map(loc => { const n = photos.filter(p => p.loc === loc).length; return { loc, share: n / photos.length }; });
  const avgDev = labels.length ? Math.round(labels.reduce((a, l) => a + l.dev, 0) / labels.length) : null;
  const before = aiHistory.find(h => !h.extended);

  let tone, wt, wx;
  if (ai && ai.extended === extended) {
    const f = ai.rates.forest, c = ai.rates.city, gap = c.score - f.score;
    if (extended && before) [tone, [wt, wx]] = f.score > before.rates.forest.score ? ["ok", t.why.better(before.rates.forest.score, f.score)] : ["info", t.why.same];
    else if (gap >= 15) [tone, [wt, wx]] = ["warn", t.why.bias(f.rate, f.fa, c.score, f.score)];
    else [tone, [wt, wx]] = ["info", t.why.noBias];
  } else if (allDone) [tone, [wt, wx]] = ["info", t.why.train];
  else if (!checked) [tone, [wt, wx]] = ["info", t.why.label];
  else if (checked.dev === 0) [tone, [wt, wx]] = ["ok", t.why.perfect];
  else [tone, [wt, wx]] = ["warn", t.why.dev(checked.dev, checked.missed, checked.falses)];

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <label className="toggle"><input type="checkbox" checked={board} onChange={e => setBoard(e.target.checked)} /><span>{t.board}</span></label>
      </ModuleIntro>

      <div className="split">
        <div className="main stack">
          <section className="card">
            <div className="row between">
              <b>{allDone ? t.allDone : t.photoOf(idx + 1, photos.length, t.photo[photo.key], t.loc[photo.loc])}</b>
              {checked && !allDone && <label className="toggle small"><input type="checkbox" checked={showGold} onChange={e => setShowGold(e.target.checked)} /><span>{t.gold}</span></label>}
            </div>
            <div className="stage mt">
              <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.photo[photo.key]} onClick={clickBg} style={{ cursor: checked || allDone ? "default" : "crosshair" }}>
                <Background loc={photo.loc} />
                {(photo.decoys || []).map((d, i) => <Decoy key={"d" + i} {...d} />)}
                {photo.items.map((it, i) => (
                  <g key={i} onClick={e => clickItem(i, e)} style={{ cursor: "pointer" }} role="button" tabIndex={checked || allDone ? -1 : 0} aria-label={`${i + 1}`}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && clickItem(i, e)}>
                    <rect x={it.x - 10} y={it.y - 10} width={it.w + 20} height={it.h + 20} fill="transparent" />
                    <Litter {...it} />
                    {marks[i] && <rect x={it.x - 7} y={it.y - 7} width={it.w + 14} height={it.h + 14} fill="none" stroke="#1E6B4E" strokeWidth="3" />}
                    {checked && showGold && <rect x={it.x - 11} y={it.y - 11} width={it.w + 22} height={it.h + 22} fill="none" stroke={marks[i] ? "#1D4ED8" : "#C2410C"} strokeWidth={marks[i] ? 2 : 3.5} strokeDasharray="6 4" />}
                    {checked && showGold && !marks[i] && <g><rect x={it.x - 11} y={it.y + it.h + 14} width="84" height="20" rx="4" fill="#C2410C" /><text x={it.x - 5} y={it.y + it.h + 28} fontSize="12" fontWeight="700" fill="#fff">{t.missed}</text></g>}
                  </g>
                ))}
                {falses.map((f, k) => (
                  <g key={k} onClick={e => removeFalse(k, e)} style={{ cursor: "pointer" }}>
                    <circle cx={f.x} cy={f.y} r="14" fill="none" stroke={checked ? "#C2410C" : "#1E6B4E"} strokeWidth="3" />
                    {checked && <line x1={f.x - 8} y1={f.y - 8} x2={f.x + 8} y2={f.y + 8} stroke="#C2410C" strokeWidth="3" />}
                  </g>
                ))}
              </svg>
            </div>
            {!allDone && <p className="muted mt-s">{t.hint}</p>}
            <div className="legend mt-s">
              <span><i style={{ border: "3px solid #1E6B4E", background: "transparent" }} />{t.legend[0]}</span>
              <span><i style={{ border: "2px dashed #1D4ED8", background: "transparent" }} />{t.legend[1]}</span>
              <span><i style={{ border: "3px dashed #C2410C", background: "transparent" }} />{t.legend[2]}</span>
            </div>
            {!allDone && (
              <div className="row mt">
                {!checked && <button onClick={compare}>{t.compare}</button>}
                {checked && <button onClick={next}>{t.nextPhoto}</button>}
                {!checked && <button className="secondary" onClick={() => { setMarks({}); setFalses([]); }}>{t.clear}</button>}
              </div>
            )}
          </section>

          {allDone && (
            <section className="card train-card">
              <h2 className="h-card">{t.trainTitle}</h2>
              <p className="muted">{t.trainLead}</p>
              {stage >= 0 ? (
                <ol className="stages mt" aria-live="polite">
                  {t.stages.map((s, i) => <li key={i} className={i < stage ? "done" : i === stage ? "now" : ""}>{i === stage && <span className="spinner" aria-hidden="true" />} {s}</li>)}
                </ol>
              ) : (!ai || ai.extended !== extended) && <button className="wide mt" onClick={trainAndTest}>{ai ? t.retrainBtn : t.trainBtn}</button>}
              {err && <div className="status warn mt" role="alert">{t.trainErr}</div>}
              {ai && (
                <div className="mt">
                  <b>{t.testTitle}</b>
                  <div className="stack-s mt-s">
                    {LOCS.map(loc => {
                      const r = ai.rates[loc], b = before && ai.extended ? before.rates[loc] : null;
                      return (
                        <div key={loc} className="loc-row">
                          <div className="barrow wide-label">
                            <span>{t.loc[loc]}</span>
                            <div className="track" style={{ position: "relative" }}>
                              <div className="fill" style={{ width: r.score + "%", background: r.score < 65 ? "#C2410C" : "#1E6B4E" }} />
                              {b && <span className="ghost-mark" style={{ left: b.score + "%" }} title={b.score + " %"} />}
                            </div>
                            <b>{r.score} %</b>
                          </div>
                          <div className="muted loc-detail">{t.detail(r.rate, r.fa)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="muted mt-s">{t.scoreHint}</p>
                  <p className="muted">{t.samples(ai.pos, ai.neg)} · {ai.kind === "mobilenet" ? "MobileNet" : "offline"}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="side stack">
          <section className="card">
            <div className="row between"><b>{t.dev}</b><span className="big-num">{avgDev === null ? "–" : avgDev + " %"}</span></div>
            <div className="track big mt-s"><div className="fill" style={{ width: Math.min(100, avgDev || 0) + "%", background: "#C2410C" }} /></div>
            <div className="muted mt-s">{t.labelled(labels.length, photos.length)}</div>
          </section>
          <section className="card">
            <b>{t.where}</b>
            <div className="stack-s mt">
              {comp.map(c => (
                <div key={c.loc} className="barrow">
                  <span>{t.loc[c.loc]}</span>
                  <div className="track"><div className="fill" style={{ width: Math.round(c.share * 100) + "%", background: c.share < 0.1 ? "#C2410C" : "#142019" }} /></div>
                  <b>{Math.round(c.share * 100)} %</b>
                </div>
              ))}
            </div>
          </section>
          <Why tone={tone} title={wt}>{wx}</Why>
          {ai && !extended && <button className="wide" onClick={addPhotos}>{t.addPhotos}</button>}
          {board && (
            <section className="card">
              <b>{t.board}</b>
              <div className="stack-s mt">
                {[[t.you, avgDev === null ? 0 : Math.max(0, 100 - avgDev), true], [t.teams[0], 78], [t.teams[1], 71], [t.teams[2], 66]]
                  .sort((a, b) => b[1] - a[1]).map(([n, v, me]) => <div key={n} className={"row between" + (me ? " strong" : "")}><span>{n}</span><span>{num(v)} {t.pts}</span></div>)}
              </div>
              <p className="muted mt-s">{t.teamNote}</p>
            </section>
          )}
        </aside>
      </div>
      <div className="stack mt-lg">
        <Tutor module="sprint" ctx={{
          nPhotos: photos.length, labeled: labels.length, avgDev, lastDev: labels.length ? labels[labels.length - 1].dev : null,
          extended, trained: !!ai && ai.extended === extended,
          rates: ai ? Object.fromEntries(Object.entries(ai.rates).map(([k, v]) => [k, v.score])) : null,
          shares: Object.fromEntries(comp.map(x => [x.loc, x.share])), locNames: t.loc
        }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
