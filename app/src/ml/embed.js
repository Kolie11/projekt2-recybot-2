// Bilder in Zahlen verwandeln („Embeddings“), damit eine KI sie vergleichen kann.
// Bevorzugt: MobileNet liefert 1280 Zahlen, die beschreiben, was auf dem Bild zu sehen ist.
// Ersatz ohne Internet: einfache Merkmale (Farbverteilung, Helligkeit, Kanten, Form).
import { getMobileNet, getTf } from "./models.js";

function simpleFeatures(canvas) {
  const size = 48;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const hist = new Array(64).fill(0);      // 4×4×4 Farbwürfel
  const rows = new Array(6).fill(0), cols = new Array(6).fill(0);
  let edges = 0, bright = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    hist[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)]++;
    const l = (r + g + b) / 3;
    bright += l;
    rows[Math.floor(y / 8)] += l; cols[Math.floor(x / 8)] += l;
    if (x > 0) { const j = i - 4; edges += Math.abs(l - (data[j] + data[j + 1] + data[j + 2]) / 3) > 40 ? 1 : 0; }
  }
  const n = size * size;
  return [...hist.map(h => h / n), ...rows.map(v => v / (n * 255 / 6)), ...cols.map(v => v / (n * 255 / 6)), edges / n, bright / (n * 255)];
}

let embedderPromise = null;
/** @returns {Promise<{kind:"mobilenet"|"simple", embed:(canvas)=>Promise<number[]>}>} */
export function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const [tf, net] = await Promise.all([getTf(), getMobileNet()]);
        return {
          kind: "mobilenet",
          async embed(canvas) {
            const t = tf.tidy(() => net.infer(canvas, true));
            const v = Array.from(await t.data());
            t.dispose();
            return v;
          }
        };
      } catch (e) {
        console.warn("[RecyBot] MobileNet nicht verfügbar, nutze einfache Merkmale:", e.message);
        return { kind: "simple", embed: async canvas => simpleFeatures(canvas) };
      }
    })();
  }
  return embedderPromise;
}
