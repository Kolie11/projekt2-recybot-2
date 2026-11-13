// Tourenplanung (Traveling Salesman Problem): Start und Ende am Depot.

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const tourLength = pts => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);
export const closedTour = (depot, stops, order) => [depot, ...order.map(i => stops[i]), depot];
export const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));

/** Heuristik 1: Fahre immer zum nächstgelegenen noch offenen Stopp. */
export function nearestNeighbour(depot, stops) {
  const left = stops.map((_, i) => i), order = [];
  let cur = depot;
  while (left.length) {
    let best = 0;
    for (let k = 1; k < left.length; k++) if (dist(cur, stops[left[k]]) < dist(cur, stops[left[best]])) best = k;
    const idx = left.splice(best, 1)[0];
    order.push(idx); cur = stops[idx];
  }
  return order;
}

/** Heuristik 2: 2-opt – dreht Teilstücke um, solange die Tour kürzer wird. Protokolliert jede Verbesserung. */
export function twoOpt(depot, stops, start) {
  let order = [...start];
  const steps = [{ order: [...order], len: tourLength(closedTour(depot, stops, order)) }];
  let improved = true, guard = 0;
  while (improved && guard++ < 500) {
    improved = false;
    for (let i = 0; i < order.length - 1 && !improved; i++) {
      for (let j = i + 1; j < order.length && !improved; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        const len = tourLength(closedTour(depot, stops, cand));
        if (len + 1e-6 < steps[steps.length - 1].len) {
          order = cand; steps.push({ order: [...order], len, i, j }); improved = true;
        }
      }
    }
  }
  return { order, steps };
}

/** Exakte Lösung durch Ausprobieren aller Reihenfolgen – nur bis ca. 9 Stopps machbar. */
export function bruteForce(depot, stops) {
  if (stops.length > 9) return null;
  let best = null, bestLen = Infinity, checked = 0;
  const idx = stops.map((_, i) => i);
  const permute = (arr, k) => {
    if (k === arr.length) {
      checked++;
      const len = tourLength(closedTour(depot, stops, arr));
      if (len < bestLen) { bestLen = len; best = [...arr]; }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  permute(idx, 0);
  return { order: best, len: bestLen, checked };
}

/** Wie oft kreuzt sich eine geschlossene Tour selbst? */
export function crossings(pts) {
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  const inter = (a, b, c, d) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++)
    for (let j = i + 2; j < pts.length - 1; j++) {
      if (i === 0 && j === pts.length - 2) continue;
      if (inter(pts[i], pts[i + 1], pts[j], pts[j + 1])) n++;
    }
  return n;
}

/** Punkt nach Strecke d entlang eines Polygonzugs. */
export function pointAt(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = dist(pts[i], pts[i + 1]);
    if (d <= seg) {
      const f = seg ? d / seg : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}
