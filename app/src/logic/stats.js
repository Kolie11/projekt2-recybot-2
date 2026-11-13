// Statistik für die Klassenauswertung (Prä-/Post-Test, siehe Paper Abschnitt V).
// Bewusst ohne Bibliothek: Mittelwert, Standardabweichung, t-Test für verbundene
// Stichproben und Effektstärke Cohen's d_z.

export const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** Stichproben-Standardabweichung (n − 1). */
export function sd(xs) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

// ---- Regularisierte unvollständige Betafunktion (Numerical Recipes, Kap. 6.4) ----
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
export function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}

/** Zweiseitiger p-Wert der t-Verteilung. */
export function tTwoSidedP(t, df) {
  if (!isFinite(t)) return 0;
  return betai(df / 2, 0.5, df / (df + t * t));
}

/**
 * t-Test für verbundene Stichproben (gleiche Person vorher/nachher).
 * pre, post: Arrays gleicher Länge (z. B. Prozent richtig).
 */
export function pairedTTest(pre, post) {
  const n = Math.min(pre.length, post.length);
  const diff = Array.from({ length: n }, (_, i) => post[i] - pre[i]);
  const md = mean(diff), s = sd(diff);
  if (n < 2) return { n, meanDiff: md, sdDiff: NaN, t: NaN, df: n - 1, p: NaN, d: NaN };
  if (s === 0) return { n, meanDiff: md, sdDiff: 0, t: md === 0 ? 0 : Infinity, df: n - 1, p: md === 0 ? 1 : 0, d: md === 0 ? 0 : Infinity };
  const t = md / (s / Math.sqrt(n));
  return { n, meanDiff: md, sdDiff: s, t, df: n - 1, p: tTwoSidedP(t, n - 1), d: md / s };
}

/** Grobe Einordnung von Cohen's d (Cohen, 1988). */
export function effectLabel(d) {
  const a = Math.abs(d);
  if (!isFinite(a)) return "large";
  return a < 0.2 ? "none" : a < 0.5 ? "small" : a < 0.8 ? "medium" : "large";
}
