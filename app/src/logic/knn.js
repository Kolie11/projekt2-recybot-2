// k-Nächste-Nachbarn: ein echter, leicht erklärbarer Lernalgorithmus.
// „Lernen“ heißt hier: Beispiele mit Label speichern.
// „Vorhersagen“ heißt: die k ähnlichsten gespeicherten Beispiele suchen und abstimmen lassen.

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export class KNN {
  constructor(k = 3) { this.k = k; this.samples = []; }
  add(vec, label, meta) { this.samples.push({ vec, label, meta }); return this; }
  get size() { return this.samples.length; }
  labels() { return [...new Set(this.samples.map(s => s.label))]; }

  /** @returns {{label, confidence, neighbours}} */
  predict(vec) {
    if (!this.samples.length) return { label: null, confidence: 0, neighbours: [] };
    const scored = this.samples.map(s => ({ ...s, sim: cosine(vec, s.vec) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, Math.min(this.k, this.samples.length));
    const votes = {};
    scored.forEach((s, i) => { votes[s.label] = (votes[s.label] || 0) + (s.sim + 1) / (i + 1); });
    const [label, w] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    return { label, confidence: total ? w / total : 0, neighbours: scored };
  }
}

/** Bewertet ein Modell auf Testdaten. */
export function evaluate(model, tests) {
  const results = tests.map(t => ({ ...t, pred: model.predict(t.vec).label }));
  const correct = results.filter(r => r.pred === r.label).length;
  return { accuracy: tests.length ? correct / tests.length : 0, correct, total: tests.length, results };
}
