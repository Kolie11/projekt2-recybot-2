// Lifecycle Tycoon: 3 Entscheidungen × 3 Optionen = 27 Produktvarianten.
// Werte je Option: [Recycling, Reparierbarkeit, Haltbarkeit, Bezahlbarkeit, CO₂-Bilanz] (0–100, hoch = gut)

export const AXES = ["recycling", "repair", "durability", "price", "co2"];
export const PARAMS = [
  { id: "material", options: [
    { id: "virgin", v: [55, 50, 45, 95, 30] },
    { id: "steel", v: [85, 60, 85, 55, 75] },
    { id: "composite", v: [20, 40, 60, 85, 55] }
  ] },
  { id: "joint", options: [
    { id: "glued", v: [30, 10, 50, 90, 60] },
    { id: "clips", v: [65, 55, 40, 75, 65] },
    { id: "screws", v: [85, 90, 80, 55, 65] }
  ] },
  { id: "build", options: [
    { id: "block", v: [40, 15, 50, 90, 55] },
    { id: "partly", v: [70, 75, 75, 65, 70] },
    { id: "modular", v: [90, 95, 85, 25, 70] }
  ] }
];
export const BADGE_SCORE = 65, BADGE_MIN = 55;

export function evaluate(choice) {
  const opts = PARAMS.map(p => p.options.find(o => o.id === choice[p.id]));
  if (opts.some(o => !o)) throw new Error("Ungültige Auswahl");
  const axes = AXES.map((_, i) => Math.round(opts.reduce((s, o) => s + o.v[i], 0) / 3));
  const mean = axes.reduce((a, b) => a + b, 0) / axes.length;
  const min = Math.min(...axes);
  const score = Math.round(mean * 0.6 + min * 0.4);
  const eco = Math.round((axes[0] + axes[1] + axes[2] + axes[4]) / 4);
  return {
    axes, score, min, eco,
    price: Math.round(20 + (100 - axes[3]) * 0.8),
    years: Math.max(1, Math.round(axes[2] / 9)),
    badge: score >= BADGE_SCORE && min >= BADGE_MIN
  };
}

export function allVariants() {
  const out = [];
  for (const a of PARAMS[0].options) for (const b of PARAMS[1].options) for (const c of PARAMS[2].options) {
    const choice = { material: a.id, joint: b.id, build: c.id };
    out.push({ choice, key: `${a.id}-${b.id}-${c.id}`, ...evaluate(choice) });
  }
  return out;
}

/** Pareto-Front: Varianten, die von keiner anderen in Umwelt UND Preis zugleich geschlagen werden. */
export function paretoFront(variants) {
  return variants.filter(v => !variants.some(w =>
    w !== v && w.eco >= v.eco && w.price <= v.price && (w.eco > v.eco || w.price < v.price)));
}
