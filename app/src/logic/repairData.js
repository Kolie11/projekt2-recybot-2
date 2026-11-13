// Reparaturfälle „Handy lädt nicht“: Symptome (Ja/Nein) → Fehlerursache.
// Die Fälle werden aus Regeln mit etwas Rauschen erzeugt – wie echte Werkstattdaten,
// in denen nicht jeder Fall lehrbuchmäßig aussieht.
import { rng } from "./rng.js";

export const FEATURES = ["led", "otherCable", "lint", "drainsFast", "hot", "afterUpdate", "wet", "wobbly"];
export const FAULTS = ["cable", "dirtyPort", "brokenPort", "battery", "software", "water"];

// Wahrscheinlichkeit, dass ein Symptom bei dieser Ursache auftritt
const P = {
  //            led   otherCable lint  drainsFast hot   afterUpdate wet  wobbly
  cable:      [0.05, 0.95,      0.1,  0.1,       0.05, 0.05,       0.03, 0.1],
  dirtyPort:  [0.1,  0.05,      0.9,  0.1,       0.05, 0.05,       0.05, 0.35],
  brokenPort: [0.15, 0.05,      0.1,  0.1,       0.1,  0.05,       0.05, 0.9],
  battery:    [0.92, 0.1,       0.05, 0.9,       0.55, 0.1,        0.05, 0.05],
  software:   [0.9,  0.1,       0.05, 0.35,      0.1,  0.9,        0.03, 0.05],
  water:      [0.4,  0.05,      0.15, 0.4,       0.3,  0.05,       0.95, 0.15]
};
export const COST = { cable: 10, dirtyPort: 0, brokenPort: 50, battery: 60, software: 0, water: 120 };

export function makeCases(n = 60, seed = 42) {
  const rand = rng(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const fault = FAULTS[i % FAULTS.length];
    const row = { id: i, fault };
    FEATURES.forEach((f, k) => { row[f] = rand() < P[fault][k]; });
    rows.push(row);
  }
  return rows;
}
