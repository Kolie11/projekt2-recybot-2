import { useEffect, useMemo, useRef, useState } from "react";
import { useCamera } from "../hooks/useCamera.js";
import { Tutor } from "../ai/TutorContext.jsx";
import { useLang, useText } from "../i18n/LangContext.jsx";
import { confusion, pct } from "../logic/metrics.js";
import { KNN } from "../logic/knn.js";
import { getEmbedder } from "../ml/embed.js";
import { cropSquare } from "../ml/models.js";
import { AiStatus, Concept, Merksatz, Meter, ModuleIntro, Why } from "../components/ui.jsx";

const PREDICT_EVERY_MS = 150;
const SCENARIOS = { quality: { p: 95, r: 40 }, volume: { p: 60, r: 85 } };
const DEMO = [
  ["clearPet", 95, true], ["greenPet", 88, true], ["juicePet", 81, true], ["pvc", 76, false],
  ["tray", 72, true], ["yoghurt", 70, false], ["crushed", 64, true], ["glass", 58, false],
  ["labelled", 55, true], ["carton", 47, false], ["foil", 41, true], ["can", 30, false]
].map(([key, score, pet], i) => ({ id: "demo-" + i, key, score, pet, img: null }));
const OUT_CLS = { TP: "tp", FP: "fp", FN: "fn", TN: "tn" };
const IMAGENET_DE = { "water bottle": "Wasserflasche", "pop bottle": "Limoflasche", "beer bottle": "Bierflasche", "wine bottle": "Weinflasche",
  "water jug": "Wasserkanister", "cup": "Becher", "coffee mug": "Tasse", "carton": "Karton", "plastic bag": "Plastiktüte", "packet": "Verpackung",
  "pill bottle": "Tablettendose", "lotion": "Lotionflasche", "soap dispenser": "Seifenspender", "vase": "Vase", "beer glass": "Bierglas", "tin can": "Dose" };

const TEXT = {
  de: {
    eyebrow: "Modul 2 · Line Controller", title: "Stell die Sortier-KI ein",
    lead: "Halte echten Müll in die Kamera. Die KI schätzt, wie sicher es sich um PET handelt. Danach legst du fest, ab welcher Sicherheit etwas auf das Recycling-Band darf.",
    step1: "Schritt 1", step1t: "Zeig der KI echten Müll", step2: "Schritt 2", step2t: "Leg die Regel der Anlage fest",
    camOn: "Kamera starten", camOff: "Kamera aus", camSwitch: "Kamera wechseln", upload: "Foto hochladen",
    noImg: "Noch kein Bild", starting: "Kamera startet …", analysing: "Die KI schaut sich das Bild an …",
    startHint: "Starte die Kamera oder lade ein Foto hoch. Die KI rechnet sofort los.",
    camErr: {
      denied: "Der Kamerazugriff ist blockiert. Klick auf das Kamera-Symbol in der Adresszeile und erlaube den Zugriff.",
      notfound: "Es wurde keine Kamera gefunden.", busy: "Die Kamera wird gerade von einem anderen Programm benutzt (zum Beispiel Teams oder Zoom).",
      insecure: "Die Kamera funktioniert nur, wenn die Seite über https geöffnet wird.", unsupported: "Dieser Browser kann nicht auf die Kamera zugreifen.",
      constraints: "Diese Kamera unterstützt die Einstellung nicht. Versuch „Kamera wechseln“.", generic: "Die Kamera ließ sich nicht starten.",
      iframe: "In dieser Vorschau ist die Kamera gesperrt. Öffne RecyBot direkt über seinen Link (z. B. Netlify) oder lade ein Foto hoch."
    },
    teachH: "Eigene Mini-KI anlernen", teachLead: "Zeig der KI ein paar Beispiele: Kamera auf ein Objekt richten oder Foto hochladen, dann speichern. Ab zwei Beispielen pro Klasse kann deine KI loslegen.",
    teachFallback: "Das große Google-Modell ist gerade nicht erreichbar. Kein Problem: Bring der KI selbst bei, wie PET aussieht.",
    addPet: "Als PET speichern", addNo: "Als Nicht-PET speichern", needImg: "Zuerst Kamera starten oder ein Foto hochladen.",
    count: (p, n) => `${p} × PET · ${n} × kein PET`, needMore: "Noch mindestens zwei Beispiele pro Klasse.",
    useOwn: "Meine Mini-KI benutzen", useBig: "Google-Modell benutzen", clearEx: "Beispiele löschen",
    ownActive: k => `Deine Mini-KI ist aktiv (k-Nächste-Nachbarn, Bildmerkmale: ${k === "mobilenet" ? "MobileNet" : "Farbe, Helligkeit, Kanten"}).`,
    ownClasses: ["PET", "kein PET"], saving: "Wird gespeichert …",
    modelMn: "Vortrainierte Google-KI (MobileNet). Ein eigenes Modell kann die Lehrkraft einstellen.",
    modelTm: n => `Eigenes Modell aus Teachable Machine · ${n}`,
    retry: "Erneut laden", modelErr: "Das große Google-Modell ist hier nicht erreichbar (z. B. Schulnetz oder Vorschau). Kein Problem: Lern unten deine eigene Mini-KI an oder nutze die Beispieldaten.",
    result: "Ergebnis der KI", petPct: v => `${v} % PET`, toRec: "Recycling-Band", toRest: "Restmüll",
    verdictRec: "Die KI hält das für PET.", verdictRest: "Die KI hält das nicht für PET.", thr: v => `Schwellwert ${v} %`,
    sees: "Was die KI zu sehen glaubt", capture: "Objekt erfassen",
    truthQ: v => `Die KI sagt ${v} % PET. Und was ist es wirklich?`, yesPet: "Es ist PET", noPet: "Kein PET", cancel: "Abbrechen",
    demo: "Ohne Kamera: Beispieldaten laden", reset: "Alles zurücksetzen",
    scen: { quality: ["Hochwertige Anlage", "Precision ≥ 95 % · Recall ≥ 40 %", "Aus dem PET sollen wieder Getränkeflaschen werden. Fremdstoffe sind hier fast nicht erlaubt."],
            volume: ["Massenanlage", "Recall ≥ 85 % · Precision ≥ 60 %", "Hier zählt die Menge. Möglichst wenig PET soll im Restmüll verloren gehen."] },
    threshold: "Schwellwert", thrHint: "Alles mit einer PET-Sicherheit ab diesem Wert kommt auf das Recycling-Band.",
    matrix: "Konfusionsmatrix", kiPet: "KI: PET", kiNo: "KI: kein PET", isPet: "Ist PET", isNo: "Kein PET",
    out: { TP: "richtig erkannt", FP: "Fehlalarm", FN: "übersehen", TN: "richtig aussortiert" },
    precision: "Precision", recall: "Recall", precHint: g => `Wie sauber ist das Recycling-Band? Ziel ≥ ${g} %`, recHint: g => `Wie viel PET wird gerettet? Ziel ≥ ${g} %`,
    curve: "Was passiert bei jedem möglichen Schwellwert?", curveHint: "Die senkrechte Linie ist dein Schwellwert.",
    items: n => `Erfasste Objekte (${n})`, none: "Noch nichts erfasst.", lanes: ["Recycling-Band", "Restmüll"],
    isPetShort: "ist PET", noPetShort: "kein PET", remove: n => `${n} entfernen`, obj: n => `Objekt ${n}`,
    demoNames: { clearPet: "PET-Flasche, klar", greenPet: "PET-Flasche, grün", juicePet: "Saftflasche (PET)", pvc: "PVC-Flasche", tray: "Obstschale (PET)", yoghurt: "Joghurtbecher", crushed: "zerdrückte PET-Flasche", glass: "Glasflasche", labelled: "PET mit großem Etikett", carton: "Getränkekarton", foil: "PET in Folie", can: "Alu-Dose" },
    why: {
      few: ["Erfasse erst ein paar Objekte", "Mindestens sechs, darunter PET und anderer Müll. Oder lade die Beispieldaten."],
      ok: { quality: ["Ziel erreicht", "Das Band ist sauber genug für neue Flaschen. Dafür landet etwas PET im Restmüll. Das ist der Preis für Reinheit."],
            volume: ["Ziel erreicht", "Du rettest fast alles PET. Ein paar Fehlalarme nimmst du dafür in Kauf. Für eine Massenanlage ist das in Ordnung."] },
      both: ["Beide Ziele verfehlt", "Schieb den Regler langsam in beide Richtungen und beobachte, welche Felder der Matrix sich füllen."],
      prec: ["Zu viele Fehlalarme", "Fremdstoffe landen im Recycling und verschmutzen das Rezyklat. Mach die KI strenger: Schwellwert hoch."],
      rec: ["Zu viel PET geht verloren", "Wertvolles PET landet im Restmüll. Mach die KI großzügiger: Schwellwert runter."]
    },
    merk: "Die KI liefert nur eine Wahrscheinlichkeit. Die Regel legt ein Mensch fest. Einen perfekten Schwellwert gibt es nicht: Mehr Precision kostet Recall, und was wichtiger ist, hängt vom Einsatz ab.",
    concept: [
      { h: "Ein Klassifikator rechnet mit Wahrscheinlichkeiten", p: "Die Bilderkennung sagt nie einfach „PET“. Sie gibt für jede Klasse eine Zahl zwischen 0 und 1 aus. Erst der Schwellwert macht daraus eine Entscheidung. Den Schwellwert wählt ein Mensch." },
      { h: "Die vier Felder der Konfusionsmatrix", p: "Jede Entscheidung landet in einem von vier Feldern: richtig erkannt (TP), Fehlalarm (FP), übersehen (FN), richtig aussortiert (TN). Fawcett (2006) beschreibt diese Tabelle als Grundwerkzeug, um Klassifikatoren zu bewerten." },
      { h: "Precision und Recall", p: <p>Precision = TP ÷ (TP + FP): Wie rein ist das, was die KI als PET meldet? Recall = TP ÷ (TP + FN): Welcher Anteil des echten PET wird gefunden? Schiebst du den Schwellwert hoch, steigt meist die Precision und der Recall sinkt. Die Kurve oben zeigt das für alle Schwellwerte auf einmal.</p> },
      { h: "Woher kommt die KI?", p: "Ohne eigenes Modell nutzt RecyBot MobileNet, ein Netz, das Google mit über einer Million Fotos aus 1000 Kategorien trainiert hat. Mit Teachable Machine wird dieses Netz per Transfer Learning auf die eigene Aufgabe angepasst: Die unteren Schichten bleiben, nur die letzte Schicht lernt aus den eigenen Fotos." }
    ],
    terms: [["Schwellwert", "Grenze, ab der „Ja“ gilt"], ["TP / FP / FN / TN", "die vier Felder der Matrix"], ["Transfer Learning", "vortrainiertes Netz, neu angepasst"]]
  },
  en: {
    eyebrow: "Module 2 · Line Controller", title: "Tune the sorting AI",
    lead: "Hold real waste up to the camera. The AI estimates how sure it is that the item is PET. Then you decide how sure it has to be before an item goes onto the recycling belt.",
    step1: "Step 1", step1t: "Show the AI real waste", step2: "Step 2", step2t: "Set the plant's rule",
    camOn: "Start camera", camOff: "Camera off", camSwitch: "Switch camera", upload: "Upload photo",
    noImg: "No image yet", starting: "Starting camera …", analysing: "The AI is looking at the image …",
    startHint: "Start the camera or upload a photo. The AI gets to work straight away.",
    camErr: {
      denied: "Camera access is blocked. Click the camera icon in the address bar and allow access.",
      notfound: "No camera was found.", busy: "The camera is being used by another program (Teams or Zoom, for example).",
      insecure: "The camera only works when the page is opened over https.", unsupported: "This browser cannot access the camera.",
      constraints: "This camera does not support the setting. Try “Switch camera”.", generic: "The camera could not be started.",
      iframe: "The camera is blocked in this preview. Open RecyBot directly via its link (e.g. Netlify) or upload a photo."
    },
    teachH: "Train your own mini AI", teachLead: "Show the AI a few examples: point the camera at an object or upload a photo, then save it. With two examples per class your AI can start.",
    teachFallback: "Google's large model can't be reached right now. No problem: teach the AI yourself what PET looks like.",
    addPet: "Save as PET", addNo: "Save as not PET", needImg: "Start the camera or upload a photo first.",
    count: (p, n) => `${p} × PET · ${n} × not PET`, needMore: "At least two examples per class still needed.",
    useOwn: "Use my mini AI", useBig: "Use Google's model", clearEx: "Delete examples",
    ownActive: k => `Your mini AI is active (k-nearest neighbours, image features: ${k === "mobilenet" ? "MobileNet" : "colour, brightness, edges"}).`,
    ownClasses: ["PET", "not PET"], saving: "Saving …",
    modelMn: "Pre-trained Google AI (MobileNet). Your teacher can set up a model of your own.",
    modelTm: n => `Your own Teachable Machine model · ${n}`,
    retry: "Load again", modelErr: "Google's large model can't be reached here (e.g. school network or preview). No problem: train your own mini AI below or use the sample data.",
    result: "AI result", petPct: v => `${v} % PET`, toRec: "Recycling belt", toRest: "Residual waste",
    verdictRec: "The AI thinks this is PET.", verdictRest: "The AI does not think this is PET.", thr: v => `threshold ${v} %`,
    sees: "What the AI thinks it sees", capture: "Capture item",
    truthQ: v => `The AI says ${v} % PET. What is it really?`, yesPet: "It is PET", noPet: "Not PET", cancel: "Cancel",
    demo: "No camera? Load sample data", reset: "Reset everything",
    scen: { quality: ["High-quality plant", "Precision ≥ 95 % · recall ≥ 40 %", "The PET is meant to become new drink bottles. Almost no foreign material is allowed."],
            volume: ["Bulk plant", "Recall ≥ 85 % · precision ≥ 60 %", "Volume is what counts here. As little PET as possible should end up in residual waste."] },
    threshold: "Threshold", thrHint: "Everything with a PET confidence at or above this value goes onto the recycling belt.",
    matrix: "Confusion matrix", kiPet: "AI: PET", kiNo: "AI: not PET", isPet: "Is PET", isNo: "Not PET",
    out: { TP: "correctly found", FP: "false alarm", FN: "missed", TN: "correctly rejected" },
    precision: "Precision", recall: "Recall", precHint: g => `How clean is the recycling belt? Goal ≥ ${g} %`, recHint: g => `How much PET is saved? Goal ≥ ${g} %`,
    curve: "What happens at every possible threshold?", curveHint: "The vertical line is your threshold.",
    items: n => `Captured items (${n})`, none: "Nothing captured yet.", lanes: ["Recycling belt", "Residual waste"],
    isPetShort: "is PET", noPetShort: "not PET", remove: n => `Remove ${n}`, obj: n => `Item ${n}`,
    demoNames: { clearPet: "PET bottle, clear", greenPet: "PET bottle, green", juicePet: "Juice bottle (PET)", pvc: "PVC bottle", tray: "Fruit tray (PET)", yoghurt: "Yoghurt pot", crushed: "Crushed PET bottle", glass: "Glass bottle", labelled: "PET with large label", carton: "Drink carton", foil: "PET in film wrap", can: "Aluminium can" },
    why: {
      few: ["Capture a few items first", "At least six, including PET and other waste. Or load the sample data."],
      ok: { quality: ["Goal reached", "The belt is clean enough for new bottles. In exchange some PET ends up in residual waste. That is the price of purity."],
            volume: ["Goal reached", "You save almost all the PET and accept a few false alarms. For a bulk plant that is fine."] },
      both: ["Both goals missed", "Move the slider slowly in both directions and watch which cells of the matrix fill up."],
      prec: ["Too many false alarms", "Foreign material ends up in the recycling stream and contaminates it. Make the AI stricter: raise the threshold."],
      rec: ["Too much PET is lost", "Valuable PET ends up in residual waste. Make the AI more generous: lower the threshold."]
    },
    merk: "The AI only gives a probability. A human sets the rule. There is no perfect threshold: more precision costs recall, and which matters more depends on the use case.",
    concept: [
      { h: "A classifier works with probabilities", p: "Image recognition never just says “PET”. It outputs a number between 0 and 1 for each class. Only the threshold turns that into a decision, and a human picks the threshold." },
      { h: "The four cells of the confusion matrix", p: "Every decision lands in one of four cells: correctly found (TP), false alarm (FP), missed (FN), correctly rejected (TN). Fawcett (2006) describes this table as the basic tool for evaluating classifiers." },
      { h: "Precision and recall", p: <p>Precision = TP ÷ (TP + FP): how pure is what the AI reports as PET? Recall = TP ÷ (TP + FN): what share of the real PET is found? Raise the threshold and precision usually goes up while recall goes down. The curve above shows this for every threshold at once.</p> },
      { h: "Where does the AI come from?", p: "Without a model of your own, RecyBot uses MobileNet, a network Google trained on more than a million photos in 1,000 categories. Teachable Machine adapts this network to a new task through transfer learning: the lower layers stay as they are, only the last layer learns from your own photos." }
    ],
    terms: [["Threshold", "cut-off above which the answer is “yes”"], ["TP / FP / FN / TN", "the four cells of the matrix"], ["Transfer learning", "a pre-trained network, adapted"]]
  }
};

function snapshotOf(el) {
  const w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight;
  if (!w || !h) return null;
  const side = Math.min(w, h), c = document.createElement("canvas");
  c.width = c.height = 200;
  c.getContext("2d").drawImage(el, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 200, 200);
  return c.toDataURL("image/jpeg", 0.75); // bleibt im Arbeitsspeicher des Browsers
}

function ThresholdCurve({ items, threshold, t }) {
  const W = 360, H = 150, x0 = 30, y0 = 125;
  const pts = [];
  for (let th = 0; th <= 100; th += 2) { const c = confusion(items, th); pts.push({ th, p: c.precision, r: c.recall }); }
  const X = th => x0 + (th / 100) * (W - x0 - 10), Y = v => y0 - v * 110;
  const path = key => pts.filter(d => d[key] !== null).map((d, i) => `${i ? "L" : "M"}${X(d.th)},${Y(d[key])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t.curve}>
      <line x1={x0} y1={y0} x2={W - 10} y2={y0} stroke="#D3DCD3" /><line x1={x0} y1={15} x2={x0} y2={y0} stroke="#D3DCD3" />
      {[0, 50, 100].map(v => <text key={v} x={x0 - 4} y={Y(v / 100) + 4} textAnchor="end" fontSize="10" fill="#4A5A50">{v}</text>)}
      {[0, 50, 100].map(v => <text key={"x" + v} x={X(v)} y={y0 + 14} textAnchor="middle" fontSize="10" fill="#4A5A50">{v}</text>)}
      <path d={path("p")} fill="none" stroke="#C2410C" strokeWidth="2.5" />
      <path d={path("r")} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeDasharray="6 4" />
      <line x1={X(threshold)} y1={12} x2={X(threshold)} y2={y0} stroke="#142019" strokeWidth="2" />
      <text x={W - 12} y={24} textAnchor="end" fontSize="11" fill="#C2410C" fontWeight="700">{t.precision}</text>
      <text x={W - 12} y={38} textAnchor="end" fontSize="11" fill="#1D4ED8" fontWeight="700">{t.recall} (- -)</text>
    </svg>
  );
}

export default function LineController({ tm, labels, petIndex, items, setItems, report }) {
  const t = useText(TEXT);
  const { lang } = useLang();
  const cam = useCamera();
  const imgRef = useRef(null);
  const [source, setSource] = useState("none");
  const [imageUrl, setImageUrl] = useState(null);
  const [preds, setPreds] = useState(null);
  const [pending, setPending] = useState(null);
  const [threshold, setThreshold] = useState(50);
  const [scen, setScen] = useState("quality");
  const reportedRef = useRef("");

  // Eigene Mini-KI: Beispiele (Bildmerkmale + Label) und k-Nächste-Nachbarn darauf.
  const [examples, setExamples] = useState([]);
  const [useOwn, setUseOwn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [embKind, setEmbKind] = useState(null);
  const nP = examples.filter(e => e.pet).length, nN = examples.length - nP;
  const ownModel = useMemo(() => {
    if (nP < 2 || nN < 2) return null;
    // Zentrieren: Was alle Beispiele gemeinsam haben (Hintergrund, Licht), wird abgezogen.
    // So vergleicht die KI nur das, was die Beispiele unterscheidet.
    const dim = examples[0].vec.length, mean = new Array(dim).fill(0);
    examples.forEach(e => e.vec.forEach((v, i) => { mean[i] += v / examples.length; }));
    const center = v => v.map((x, i) => x - mean[i]);
    const knn = new KNN(Math.min(5, examples.length));
    examples.forEach(e => knn.add(center(e.vec), e.pet ? "PET" : "other"));
    return {
      kind: "own", labels: ["PET", "other"],
      async predict(source) {
        const canvas = cropSquare(source, 224);
        if (!canvas) return null;
        const emb = await getEmbedder();
        // Sicherheit = gewichteter Anteil PET unter den k ähnlichsten Beispielen (ähnlichere zählen mehr)
        const r = knn.predict(center(await emb.embed(canvas)));
        const w = r.neighbours.map(nb => ({ pet: nb.label === "PET", w: Math.exp(6 * nb.sim) }));
        const total = w.reduce((a, x) => a + x.w, 0);
        const pet = total ? w.filter(x => x.pet).reduce((a, x) => a + x.w, 0) / total : 0;
        return { classes: [{ label: "PET", probability: pet }, { label: "other", probability: 1 - pet }], petScore: pet, seen: null };
      }
    };
  }, [examples, nP, nN]);
  // Ist das große Modell nicht erreichbar, übernimmt die eigene Mini-KI automatisch.
  const model = (useOwn || tm.status === "error") && ownModel ? ownModel : tm.model;
  const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const petScore = preds ? Math.round(preds.petScore * 100) : null;

  useEffect(() => {
    if (!model || source !== "camera" || cam.status !== "on" || pending) return;
    let alive = true, timer;
    const tick = async () => {
      if (!alive) return;
      try { const r = await model.predict(cam.videoRef.current, petIndex); if (alive && r) setPreds(r); } catch (e) { console.error(e); }
      if (alive) timer = setTimeout(tick, PREDICT_EVERY_MS);
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [model, source, cam.status, pending, cam.videoRef, petIndex]);

  useEffect(() => () => cam.stop(), [cam.stop]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const predictImage = async () => {
    if (!model || !imgRef.current) return;
    try { const r = await model.predict(imgRef.current, petIndex); if (r) setPreds(r); } catch (e) { console.error(e); }
  };
  useEffect(() => { if (model && source === "image" && imgRef.current?.complete) predictImage(); }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

  const addExample = async pet => {
    const el = source === "camera" ? cam.videoRef.current : imgRef.current;
    const canvas = el && cropSquare(el, 224);
    if (!canvas) return;
    setSaving(true);
    try {
      const emb = await getEmbedder();
      setEmbKind(emb.kind);
      const vec = await emb.embed(canvas);
      setExamples(prev => [...prev, { id: "ex" + Date.now(), pet, vec, img: canvas.toDataURL("image/jpeg", 0.6) }]);
      setUseOwn(true); setPreds(null);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const onFile = e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    cam.stop(); setPreds(null); setImageUrl(URL.createObjectURL(f)); setSource("image");
  };
  const capture = () => {
    if (petScore === null) return;
    const el = source === "camera" ? cam.videoRef.current : imgRef.current;
    setPending({ id: "o-" + Date.now(), n: items.length + 1, score: petScore, img: el ? snapshotOf(el) : null });
  };
  const confirm = isPet => { setItems(prev => [...prev, { ...pending, pet: isPet }]); setPending(null); };

  const c = useMemo(() => confusion(items, threshold), [items, threshold]);
  const prec = pct(c.precision), rec = pct(c.recall);
  const s = SCENARIOS[scen], st = t.scen[scen];
  const nPet = items.filter(i => i.pet).length;
  const enough = items.length >= 6 && nPet > 0 && nPet < items.length;
  const pOk = prec !== null && prec >= s.p, rOk = rec !== null && rec >= s.r;

  useEffect(() => {
    if (!(enough && pOk && rOk)) return;
    const key = `${scen}|${prec}|${rec}`;
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    report({ prec, rec, scen, threshold });
  }, [enough, pOk, rOk, scen, prec, rec, threshold, report]);

  const [whyTone, [whyTitle, whyText]] = !enough ? ["info", t.why.few] : pOk && rOk ? ["ok", t.why.ok[scen]] : !pOk && !rOk ? ["warn", t.why.both] : !pOk ? ["warn", t.why.prec] : ["info", t.why.rec];
  const verdict = petScore === null ? null : petScore >= threshold ? ["tp", t.toRec, t.verdictRec] : ["tn", t.toRest, t.verdictRest];
  const itemName = it => (it.key ? t.demoNames[it.key] : t.obj(it.n));
  const seenName = l => (lang === "de" ? IMAGENET_DE[l] || l : l);

  return (
    <section>
      <ModuleIntro eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <div className="split">
        <div className="side stack">
          <section className="card">
            <div className="eyebrow">{t.step1}</div>
            <h2 className="h-card">{t.step1t}</h2>
            {tm.status === "error" ? <div className="status info" role="status">{t.modelErr}</div> : <AiStatus status={tm.status} />}
            {tm.status === "error" && <button className="link" onClick={tm.retry}>{t.retry}</button>}
            {model?.kind === "own" ? <div className="status ok">{t.ownActive(embKind)}</div>
              : tm.status === "ready" && <div className="status ok">{model.kind === "mobilenet" ? t.modelMn : t.modelTm(labels.join(", "))}</div>}

            <div className="preview">
              <video ref={cam.videoRef} className={cam.facing === "user" ? "mirror" : ""} hidden={source !== "camera" || cam.status !== "on"} playsInline muted aria-label="Camera" />
              {source === "image" && imageUrl && <img ref={imgRef} src={imageUrl} alt="" onLoad={predictImage} />}
              {source === "camera" && cam.status === "starting" && <span className="muted">{t.starting}</span>}
              {(source === "none" || (source === "camera" && (cam.status === "off" || cam.status === "error"))) && <span className="muted">{t.noImg}</span>}
              {pending?.img && <img className="frozen" src={pending.img} alt="" />}
            </div>
            {cam.error && <div className="status warn" role="alert">{cam.error.code === "denied" && inFrame ? t.camErr.iframe : t.camErr[cam.error.code] || t.camErr.generic}</div>}

            <div className="row">
              {cam.status === "on"
                ? <button className="secondary" onClick={() => { cam.stop(); setSource("none"); setPreds(null); }}>{t.camOff}</button>
                : <button onClick={() => { setSource("camera"); setPreds(null); cam.start(); }} disabled={cam.status === "starting"}>{t.camOn}</button>}
              {cam.status === "on" && cam.hasMultiple && <button className="secondary" onClick={cam.switchCamera}>{t.camSwitch}</button>}
              <label className="btn secondary">{t.upload}<input type="file" accept="image/*" onChange={onFile} hidden /></label>
            </div>

            <details className="teach" open={tm.status === "error" || examples.length > 0 || undefined}>
              <summary><b>{t.teachH}</b></summary>
              {tm.status === "error" && <p className="status info">{t.teachFallback}</p>}
              <p className="muted">{t.teachLead}</p>
              <div className="row">
                <button className="secondary" disabled={saving || (source === "none") || (source === "camera" && cam.status !== "on")} onClick={() => addExample(true)}>{t.addPet}</button>
                <button className="secondary" disabled={saving || (source === "none") || (source === "camera" && cam.status !== "on")} onClick={() => addExample(false)}>{t.addNo}</button>
              </div>
              {source === "none" && <p className="muted mt-s">{t.needImg}</p>}
              {examples.length > 0 && (
                <>
                  <div className="ex-strip" aria-label={t.count(nP, nN)}>
                    {examples.map(e => <figure key={e.id} className={e.pet ? "pet" : "no"}><img src={e.img} alt="" /><figcaption>{e.pet ? t.ownClasses[0] : t.ownClasses[1]}</figcaption></figure>)}
                  </div>
                  <p className="muted mt-s" aria-live="polite">{saving ? t.saving : t.count(nP, nN)}{!ownModel && " · " + t.needMore}</p>
                  <div className="row">
                    {ownModel && tm.status === "ready" && <button className="link" onClick={() => { setUseOwn(u => !u); setPreds(null); }}>{useOwn ? t.useBig : t.useOwn}</button>}
                    <button className="link" onClick={() => { setExamples([]); setUseOwn(false); setPreds(null); }}>{t.clearEx}</button>
                  </div>
                </>
              )}
            </details>

            {!preds && model && source !== "none" && cam.status !== "error" && <p className="muted mt-s">{t.analysing}</p>}
            {!preds && source === "none" && <p className="muted mt-s">{t.startHint}</p>}
            {preds && (
              <div className={"result " + verdict[0]} aria-live="polite">
                <div className="result-top">
                  <div><div className="result-k">{t.result}</div><div className="result-score">{t.petPct(petScore)}</div></div>
                  <div className="result-lane">→ {verdict[1]}</div>
                </div>
                <div className="muted">{verdict[2]} ({t.thr(threshold)})</div>
                <div className="seen">
                  {preds.seen && <b>{t.sees}</b>}
                  {(preds.seen || preds.classes).map(p => {
                    const v = Math.round(p.probability * 100);
                    return (
                      <div className="bar" key={p.label}>
                        <div className="lbl"><span>{preds.seen ? seenName(p.label) : p.label === "other" ? t.ownClasses[1] : p.label}</span><span>{v} %</span></div>
                        <div className="track"><div className="fill" style={{ width: v + "%" }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!pending
              ? <button className="wide mt" onClick={capture} disabled={petScore === null}>{t.capture}</button>
              : (
                <div className="truth mt">
                  <b>{t.truthQ(pending.score)}</b>
                  <div className="row">
                    <button style={{ flex: 1 }} onClick={() => confirm(true)}>{t.yesPet}</button>
                    <button style={{ flex: 1 }} className="secondary" onClick={() => confirm(false)}>{t.noPet}</button>
                  </div>
                  <button className="link" onClick={() => setPending(null)}>{t.cancel}</button>
                </div>
              )}
            <div className="row mt">
              <button className="link" onClick={() => setItems(DEMO)}>{t.demo}</button>
              <button className="link" onClick={() => setItems([])}>{t.reset}</button>
            </div>
          </section>
        </div>

        <div className="main stack">
          <section className="card">
            <div className="eyebrow">{t.step2}</div>
            <h2 className="h-card">{t.step2t}</h2>
            <div className="scen" role="radiogroup">
              {Object.keys(SCENARIOS).map(k => (
                <button key={k} role="radio" aria-checked={k === scen} className={k === scen ? "on" : ""} onClick={() => setScen(k)}>
                  <span>{t.scen[k][0]}</span><small>{t.scen[k][1]}</small>
                </button>
              ))}
            </div>
            <p className="muted">{st[2]}</p>
            <div className="thr"><label htmlFor="thr">{t.threshold}</label><b>{threshold} %</b></div>
            <input id="thr" type="range" min="0" max="100" value={threshold} onChange={e => setThreshold(+e.target.value)} />
            <div className="muted">{t.thrHint}</div>
          </section>

          <div className="pair">
            <section className="card">
              <h2 className="h-card">{t.matrix}</h2>
              <div className="matrix">
                <div /><div className="h">{t.kiPet}</div><div className="h">{t.kiNo}</div>
                <div className="r">{t.isPet}</div>
                <div className="cell tp"><b>{c.tp}</b>{t.out.TP}</div>
                <div className="cell fn"><b>{c.fn}</b>{t.out.FN}</div>
                <div className="r">{t.isNo}</div>
                <div className="cell fp"><b>{c.fp}</b>{t.out.FP}</div>
                <div className="cell tn"><b>{c.tn}</b>{t.out.TN}</div>
              </div>
            </section>
            <section className="card">
              <Meter label={t.precision} value={prec} color="#C2410C" hint={t.precHint(s.p)} />
              <Meter label={t.recall} value={rec} color="#1D4ED8" hint={t.recHint(s.r)} />
            </section>
          </div>

          <Why tone={whyTone} title={whyTitle}>{whyText}</Why>

          {items.length >= 4 && (
            <section className="card">
              <b>{t.curve}</b>
              <ThresholdCurve items={items} threshold={threshold} t={t} />
              <div className="muted">{t.curveHint}</div>
            </section>
          )}

          <section className="card">
            <h2 className="h-card">{t.items(items.length)}</h2>
            {!c.rows.length ? <div className="muted">{t.none}</div> : (
              <div className="lanes">
                {[0, 1].map(lane => {
                  const rows = c.rows.filter(r => r.predicted === (lane === 0)).sort((a, b) => b.score - a.score);
                  return (
                    <div key={lane} className={"lane " + (lane === 0 ? "lane-rec" : "lane-rest")}>
                      <div className="lane-h">{t.lanes[lane]}<span className="muted">{rows.length}</span></div>
                      <div className="items">
                        {rows.map(it => (
                          <div className="item" key={it.id}>
                            {it.img ? <img src={it.img} alt={itemName(it)} /> : <div className="ph">{itemName(it)}</div>}
                            <div className="meta"><b>{itemName(it)}</b><br />{it.score} % · {it.pet ? t.isPetShort : t.noPetShort}<br />
                              <span className={"badge " + OUT_CLS[it.outcome]}>{t.out[it.outcome]}</span></div>
                            <button className="x" aria-label={t.remove(itemName(it))} onClick={() => setItems(prev => prev.filter(p => p.id !== it.id))}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <div className="stack mt-lg">
        <Tutor module="line" ctx={{ scen, scenName: st[0], targetP: s.p, targetR: s.r, threshold, prec, rec, n: items.length, nPet, tp: c.tp, fp: c.fp, fn: c.fn, tn: c.tn, enough }} />
        <Merksatz>{t.merk}</Merksatz>
        <Concept sections={t.concept} terms={t.terms} />
      </div>
    </section>
  );
}
