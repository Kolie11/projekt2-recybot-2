// Kleines Systemdynamik-Modell einer Stadt. Bestände: Recyclingquote, Container, Budget.
// Verzögerung: Container und Kampagnen wirken erst im Folgejahr.
// Rückkopplung: hohes Pfand ohne Rückgabestellen senkt die Zufriedenheit.

export const START_YEAR = 2026, ROUNDS = 6, BUDGET = 9, GOAL_R = 65, GOAL_S = 60;
export const DISTRICTS = [
  { id: "oldtown", cov: 0.8 }, { id: "campus", cov: 0.65 }, { id: "harbour", cov: 0.2 },
  { id: "northpark", cov: 0.5 }, { id: "industry", cov: 0.3 }, { id: "southhill", cov: 0.45 }
];
export const RAIN = [92, 98, 105, 111, 118, 124, 130];
export const LIMITS = { deposit: [0, 0.5, 0.05], containers: [0, 150, 10], campaign: [0, 3, 1], repair: [0, 3, 1] };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const coverage = (base, containers) => Math.min(1, base + (containers / 300) * 0.22);
export const yearCost = lev => +(lev.containers * 0.005 + lev.campaign * 0.25 + lev.repair * 0.2).toFixed(2);

export function districtSatisfaction(lev, cov) {
  const pain = lev.deposit * 70 * (1 - cov);
  return Math.round(clamp(62 - pain + lev.campaign * 2.5 + lev.repair * 3 + cov * 8, 0, 100));
}

export const initialState = () => ({
  R: 38, S: 62, budget: BUDGET, containersTotal: 0, year: START_YEAR, prevLev: null,
  districts: DISTRICTS.map(d => ({ ...d, s: 62 }))
});

export function step(state, lev) {
  const prev = state.prevLev || { containers: 0, campaign: 0 };
  const target = 34 + lev.deposit * 55 + (prev.containers / 300) * 18 + prev.campaign * 3.5 + lev.repair * 1.5;
  const R = Math.round(state.R + (target - state.R) * 0.55);
  const containersTotal = state.containersTotal + lev.containers;
  const districts = DISTRICTS.map(d => ({ ...d, s: districtSatisfaction(lev, coverage(d.cov, containersTotal)) }));
  const S = Math.round(districts.reduce((a, d) => a + d.s, 0) / districts.length);
  return { R, S, budget: +(state.budget - yearCost(lev)).toFixed(2), districts, containersTotal, prevLev: lev, year: state.year + 1 };
}

export function runPolicy(lev, rounds = ROUNDS) {
  let s = initialState();
  const history = [{ year: s.year, R: s.R, S: s.S }];
  for (let i = 0; i < rounds; i++) { s = step(s, lev); history.push({ year: s.year, R: s.R, S: s.S }); }
  return { final: s, history };
}

export const goalsMet = s => ({ R: s.R >= GOAL_R, S: s.S >= GOAL_S, budget: s.budget >= 0 });

/**
 * „KI-Berater“: probiert alle Hebel-Kombinationen durch und wählt die mit der besten Zielfunktion.
 * weights bestimmt, was der KI wichtig ist (Quote vs. Zufriedenheit). Budget ist eine harte Grenze.
 */
export function optimise(weights = { R: 1, S: 1 }) {
  let best = null, tried = 0;
  for (let d = 0; d <= 10; d++) for (let c = 0; c <= 15; c += 3) for (let k = 0; k <= 3; k++) for (let r = 0; r <= 3; r++) {
    const lev = { deposit: d * 0.05, containers: c * 10, campaign: k, repair: r };
    const { final } = runPolicy(lev);
    tried++;
    if (final.budget < 0) continue;
    const score = weights.R * final.R + weights.S * final.S + final.budget * 0.5;
    if (!best || score > best.score) best = { lev, final, score };
  }
  return { ...best, tried };
}
