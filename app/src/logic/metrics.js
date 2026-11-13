// Kennzahlen für einen binären Klassifikator (PET / kein PET).

/**
 * @param {{score:number, pet:boolean}[]} items  score in Prozent (0–100)
 * @param {number} threshold  ab diesem Score sagt die Anlage „PET“
 */
export function confusion(items, threshold) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const rows = items.map(it => {
    const predicted = it.score >= threshold;
    const outcome = predicted ? (it.pet ? "TP" : "FP") : (it.pet ? "FN" : "TN");
    if (outcome === "TP") tp++; else if (outcome === "FP") fp++; else if (outcome === "FN") fn++; else tn++;
    return { ...it, predicted, outcome };
  });
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : null;
  const accuracy = rows.length ? (tp + tn) / rows.length : null;
  return { tp, fp, fn, tn, rows, precision, recall, f1, accuracy };
}

/** Prozent, gerundet; null bleibt null. */
export const pct = v => (v === null || v === undefined ? null : Math.round(v * 100));

/** Intersection over Union zweier Rechtecke {x,y,w,h}. */
export function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Ordnet gezeichnete Rahmen den echten Objekten zu (gierig nach höchster IoU).
 * @returns {{item, box, iou, status:"ok"|"wrong"|"missed"}[]} und Anzahl überzähliger Rahmen
 */
export function matchBoxes(truth, boxes, minIou = 0.35) {
  const pairs = [];
  truth.forEach((t, ti) => boxes.forEach((b, bi) => pairs.push({ ti, bi, v: iou(t, b) })));
  pairs.sort((a, b) => b.v - a.v);
  const usedT = new Set(), usedB = new Set(), match = {};
  for (const p of pairs) {
    if (p.v < minIou) break;
    if (usedT.has(p.ti) || usedB.has(p.bi)) continue;
    usedT.add(p.ti); usedB.add(p.bi); match[p.ti] = p;
  }
  const res = truth.map((t, ti) => {
    const m = match[ti];
    if (!m) return { item: t, box: null, iou: 0, status: "missed" };
    const box = boxes[m.bi];
    return { item: t, box, iou: m.v, status: box.cls === t.cls ? "ok" : "wrong" };
  });
  return { res, extra: boxes.length - usedB.size };
}
