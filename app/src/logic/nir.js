// Nahinfrarot-Sensor einer Sortieranlage: misst, wie stark ein Kunststoff Licht in 8 Wellenbändern
// zurückwirft. Jeder Kunststoff hat einen typischen „Fingerabdruck“. Schmutz, Abstand und Etiketten
// verändern die Messung – deshalb Rauschen und eine zufällige Helligkeit.
import { gauss, rng, shuffle } from "./rng.js";

export const MATERIALS = ["PET", "PP", "PS", "PVC"];
export const BANDS = 8;
const BASE = {
  PET: [0.62, 0.55, 0.40, 0.68, 0.52, 0.30, 0.58, 0.45],
  PP:  [0.70, 0.66, 0.60, 0.42, 0.35, 0.48, 0.62, 0.55],
  PS:  [0.50, 0.58, 0.66, 0.55, 0.60, 0.40, 0.38, 0.62],
  PVC: [0.60, 0.52, 0.44, 0.62, 0.58, 0.36, 0.50, 0.40]   // PVC ist PET sehr ähnlich – das macht es schwer
};

export function makeDataset(n = 1000, seed = 7, noise = 0.05) {
  const rand = rng(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const label = i % MATERIALS.length;
    const brightness = 0.7 + rand() * 0.6;
    const x = BASE[MATERIALS[label]].map(v => Math.max(0, v * brightness + gauss(rand, 0, noise)));
    rows.push({ x, y: label });
  }
  const mixed = shuffle(rows, rand);
  const cut = Math.round(mixed.length * 0.8);
  return { train: mixed.slice(0, cut), test: mixed.slice(cut) };
}

export const MODEL_SPECS = {
  mini: { hidden: [4] },
  medium: { hidden: [16, 16] },
  huge: { hidden: [128, 128, 128] }
};

export function paramCount(hidden, inputs = BANDS, outputs = MATERIALS.length) {
  let prev = inputs, n = 0;
  for (const h of [...hidden, outputs]) { n += prev * h + h; prev = h; }
  return n;
}

// Energie-Schätzung: Training ≈ 6 Rechenoperationen pro Parameter und Messung
// (Vorwärts- und Rückwärtsrechnung). Annahme: 5·10⁻¹⁰ J pro Operation (typischer Laptop-Prozessor).
// Hochgerechnet auf eine echte Anlage mit 10 Mio. Trainingsmessungen.
export const JOULE_PER_FLOP = 5e-10;
export const REAL_SAMPLES = 1e7;
export function trainingFlops(params, samples, epochs) { return 6 * params * samples * epochs; }
export function energyKJ(params, epochs, samples = REAL_SAMPLES) {
  return (trainingFlops(params, samples, epochs) * JOULE_PER_FLOP) / 1000;
}
