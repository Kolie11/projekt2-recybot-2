// Zentrale Stelle für alle echten KI-Modelle. Alles läuft im Browser (TensorFlow.js).
// - TensorFlow.js und MobileNet werden erst geladen, wenn ein Modul sie braucht (eigene Bundle-Datei).
// - Jeder Ladevorgang hat ein Zeitlimit, damit die App nicht „hängt“.
// - Fehlgeschlagene Ladevorgänge können erneut versucht werden.

// TensorFlow.js und die MobileNet-Bibliothek sind Teil des Builds (kein externes CDN nötig).
// Die MobileNet-Gewichte (ca. 14 MB) werden zuerst lokal gesucht (./models/mobilenet_v2/),
// sonst bei Google geladen. Lokal ablegen: `npm run fetch-models` (siehe README).
const LOCAL_MOBILENET = "./models/mobilenet_v2/model.json";
const TIMEOUT_MS = 45000;

const withTimeout = (p, ms, what) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what}: Zeitüberschreitung`)), ms))
]);

let tfPromise = null;
export function getTf() {
  if (!tfPromise) {
    tfPromise = withTimeout(import("@tensorflow/tfjs").then(async tf => { await tf.ready(); return tf; }), TIMEOUT_MS, "TensorFlow.js")
      .catch(e => { tfPromise = null; throw e; });
  }
  return tfPromise;
}

async function hasLocalWeights() {
  try {
    const r = await fetch(LOCAL_MOBILENET, { cache: "no-cache" });
    return r.ok && (r.headers.get("content-type") || "").includes("json");
  } catch { return false; }
}

/** Woher kamen die Gewichte? "local" | "google" | null (noch nicht geladen) */
export let mobilenetSource = null;

let mobilenetPromise = null;
export function getMobileNet() {
  if (!mobilenetPromise) {
    mobilenetPromise = (async () => {
      await getTf();
      const mn = await import("@tensorflow-models/mobilenet");
      if (await hasLocalWeights()) {
        try {
          const model = await withTimeout(mn.load({ version: 2, alpha: 1.0, modelUrl: LOCAL_MOBILENET }), TIMEOUT_MS, "MobileNet (lokal)");
          mobilenetSource = "local";
          return model;
        } catch (e) { console.warn("Lokale MobileNet-Gewichte unbrauchbar, lade bei Google:", e); }
      }
      const model = await withTimeout(mn.load({ version: 2, alpha: 1.0 }), TIMEOUT_MS, "MobileNet");
      mobilenetSource = "google";
      return model;
    })().catch(e => { mobilenetPromise = null; throw e; });
  }
  return mobilenetPromise;
}

/** Quadratischer Mittelausschnitt einer Bildquelle auf ein Canvas der Größe size. */
export function cropSquare(source, size = 224) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const side = Math.min(w, h);
  canvas.getContext("2d").drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return canvas;
}

/* ---------- Bildklassifikation für Modul 2 ---------- */

/** Eigenes Teachable-Machine-Modell (Transfer Learning auf MobileNet). */
export async function loadTmModel(baseUrl) {
  const tf = await getTf();
  const res = await withTimeout(fetch(baseUrl + "metadata.json"), TIMEOUT_MS, "metadata.json");
  if (!res.ok) throw new Error("metadata.json: HTTP " + res.status);
  const meta = await res.json();
  if (!Array.isArray(meta.labels) || !meta.labels.length) throw new Error("metadata.json enthält keine Klassen");
  const model = await withTimeout(tf.loadLayersModel(baseUrl + "model.json"), TIMEOUT_MS, "model.json");
  const size = meta.imageSize || 224;
  tf.tidy(() => model.predict(tf.zeros([1, size, size, 3])));
  return {
    kind: "tm", labels: meta.labels,
    async predict(source, petIndex) {
      const canvas = cropSquare(source, size);
      if (!canvas) return null;
      const probs = tf.tidy(() => model.predict(tf.browser.fromPixels(canvas).toFloat().sub(127.5).div(127.5).expandDims(0)).dataSync());
      const classes = meta.labels.map((label, i) => ({ label, probability: probs[i] ?? 0 }));
      return { classes, petScore: classes[petIndex]?.probability ?? 0, seen: null };
    }
  };
}

const PET_IMAGENET = ["water bottle", "pop bottle"];
/** Ohne eigenes Modell: vortrainiertes MobileNet (1000 Alltagsklassen, u. a. Plastikflaschen). */
export async function loadMobileNetClassifier() {
  const model = await getMobileNet();
  return {
    kind: "mobilenet", labels: ["PET", "other"],
    async predict(source) {
      const canvas = cropSquare(source, 224);
      if (!canvas) return null;
      const all = await model.classify(canvas, 1000);
      let pet = 0;
      for (const p of all) if (PET_IMAGENET.includes(p.className.split(",")[0].trim().toLowerCase())) pet += p.probability;
      pet = Math.min(1, pet);
      return {
        classes: [{ label: "PET", probability: pet }, { label: "other", probability: 1 - pet }],
        petScore: pet,
        seen: all.slice(0, 3).map(p => ({ label: p.className.split(",")[0].trim(), probability: p.probability }))
      };
    }
  };
}

export function findPetIndex(labels, wanted) {
  if (!labels?.length) return 0;
  const lower = labels.map(l => String(l).toLowerCase().trim());
  if (wanted) { const i = lower.indexOf(String(wanted).toLowerCase().trim()); if (i >= 0) return i; }
  const exact = lower.indexOf("pet");
  if (exact >= 0) return exact;
  const fuzzy = lower.findIndex(l => l.includes("pet") && !/^(kein|nicht|no|non|other)/.test(l));
  return fuzzy >= 0 ? fuzzy : 0;
}
