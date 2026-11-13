// Kleiner, deterministischer Zufallsgenerator (mulberry32).
// Gleicher Seed → gleiche Daten. Wichtig, damit alle Schüler:innen dieselben Fälle sehen
// und Ergebnisse reproduzierbar sind.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalverteilte Zufallszahl (Box-Muller). */
export function gauss(rand, mean = 0, sd = 1) {
  const u = Math.max(rand(), 1e-12), v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
