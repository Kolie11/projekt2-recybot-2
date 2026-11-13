// Capstone: Die Ergebnisse der Module 1–8 werden zu einer Stadt verrechnet.
// Jede Regel bildet einen echten Zusammenhang der Kreislaufwirtschaft ab (siehe Paper, Abschnitt IV.I).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function computeCity(r = {}) {
  const { label, line, tycoon, repair, routes, policy, sprint, green } = r;
  let circ = 40, co2 = 0, sat = policy ? policy.S : 55;
  if (label) circ += (label.acc - 0.7) * 20;
  if (line) circ += ((line.prec ?? 70) - 70) * 0.25;
  if (tycoon) {
    circ += (tycoon.score - 50) * 0.25;
    if (tycoon.material === "composite") circ -= 6;
    co2 += tycoon.material === "virgin" ? 4 : tycoon.material === "steel" ? -4 : 0;
  }
  if (repair) {
    if (repair.solved) { circ += 6; co2 -= 3; sat += 2; }
    if (repair.broken && !repair.solved) circ -= 6;
  }
  if (sprint) { if (sprint.diversified) { circ += 4; sat += 2; } circ -= (sprint.dev - 20) * 0.1; }
  if (policy) circ += (policy.R - 40) * 0.3;
  if (routes) co2 += -10 + routes.overhead * 0.4;
  if (green) co2 += green.model === "huge" ? 8 : -5;

  const tile = (status, data) => ({ status, data: data || {} });
  const tiles = {
    label: !label ? tile("open") : tile(label.acc >= 0.85 ? "good" : label.acc >= 0.65 ? "mid" : "bad", { acc: Math.round(label.acc * 100) }),
    line: !line ? tile("open") : tile(tycoon?.material === "composite" ? "bad" : line.prec >= 90 ? "good" : line.prec >= 70 ? "mid" : "bad",
      { prec: line.prec, composite: tycoon?.material === "composite" }),
    tycoon: !tycoon ? tile("open") : tile(tycoon.badge ? "good" : tycoon.material === "composite" ? "bad" : "mid", { score: tycoon.score }),
    repair: !repair ? tile("open") : tile(repair.solved ? "good" : repair.broken ? "bad" : "mid", { solved: !!repair.solved, broken: !!repair.broken, count: repair.solvedCount ?? (repair.solved ? 1 : 0) }),
    routes: !routes ? tile("open") : tile(routes.overhead <= 5 ? "good" : routes.overhead <= 20 ? "mid" : "bad", { overhead: Math.max(0, routes.overhead) }),
    policy: !policy ? tile("open") : tile(policy.goals ? "good" : (policy.R >= 65 || policy.S >= 60) ? "mid" : "bad", { R: policy.R, S: policy.S }),
    sprint: !sprint ? tile("open") : tile(sprint.diversified ? (sprint.dev <= 25 ? "good" : "mid") : "bad", { dev: sprint.dev, diversified: !!sprint.diversified }),
    green: !green ? tile("open") : tile(green.model === "huge" ? "bad" : "good", { model: green.model, apj: green.apj })
  };

  // Kettenreaktionen: Ursache in Modul A → Folge in Modul B
  const chains = [];
  if (tycoon?.material === "composite") chains.push({ id: "composite", view: "tycoon" });
  if (label && label.acc < 0.8) chains.push({ id: "labels", view: "label", acc: Math.round(label.acc * 100) });
  if (sprint && !sprint.diversified) chains.push({ id: "bias", view: "sprint" });
  if (routes && routes.overhead > 15) chains.push({ id: "routes", view: "routes", overhead: routes.overhead });
  if (policy && policy.S < 60) chains.push({ id: "satisfaction", view: "policy", S: policy.S });
  if (green?.model === "huge") chains.push({ id: "energy", view: "green" });
  if (repair?.broken && !repair.solved) chains.push({ id: "ewaste", view: "repair" });

  return { circ: Math.round(clamp(circ, 0, 100)), co2: Math.round(clamp(co2, -40, 40)), sat: Math.round(clamp(sat, 0, 100)), tiles, chains };
}
