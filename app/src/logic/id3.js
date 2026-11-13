// ID3-Entscheidungsbaum (Quinlan, 1986) für Ja/Nein-Merkmale.
// Der Baum wählt an jeder Stelle die Frage mit dem größten Informationsgewinn,
// also die Frage, die die verbleibenden Möglichkeiten am stärksten ordnet.

export function counts(rows, target) {
  const c = {};
  rows.forEach(r => { c[r[target]] = (c[r[target]] || 0) + 1; });
  return c;
}

/** Entropie in Bit: 0 = alle Fälle gleich, hoch = bunt gemischt. */
export function entropy(rows, target) {
  if (!rows.length) return 0;
  return Object.values(counts(rows, target)).reduce((h, n) => {
    const p = n / rows.length;
    return h - p * Math.log2(p);
  }, 0);
}

export function infoGain(rows, attr, target) {
  const yes = rows.filter(r => r[attr]), no = rows.filter(r => !r[attr]);
  if (!yes.length || !no.length) return 0;
  return entropy(rows, target) - (yes.length / rows.length) * entropy(yes, target) - (no.length / rows.length) * entropy(no, target);
}

const majority = (rows, target) => Object.entries(counts(rows, target)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

export function buildTree(rows, attrs, target, { maxDepth = 6, minGain = 1e-9 } = {}, depth = 0) {
  const c = counts(rows, target);
  const node = { n: rows.length, counts: c, label: majority(rows, target) };
  if (Object.keys(c).length <= 1 || depth >= maxDepth || !attrs.length) return { ...node, leaf: true };
  const gains = attrs.map(a => ({ attr: a, gain: infoGain(rows, a, target) })).sort((a, b) => b.gain - a.gain);
  const best = gains[0];
  if (best.gain <= minGain) return { ...node, leaf: true };
  const rest = attrs.filter(a => a !== best.attr);
  return {
    ...node, leaf: false, attr: best.attr, gain: best.gain, gains,
    yes: buildTree(rows.filter(r => r[best.attr]), rest, target, { maxDepth, minGain }, depth + 1),
    no: buildTree(rows.filter(r => !r[best.attr]), rest, target, { maxDepth, minGain }, depth + 1)
  };
}

/** Folgt dem Baum für einen Fall. @returns {{label, path:[{attr, answer}]}} */
export function classify(tree, row) {
  const path = [];
  let node = tree;
  while (!node.leaf) {
    const answer = !!row[node.attr];
    path.push({ attr: node.attr, answer });
    node = answer ? node.yes : node.no;
  }
  return { label: node.label, path, leaf: node };
}

export function accuracy(tree, rows, target) {
  if (!rows.length) return 0;
  return rows.filter(r => classify(tree, r).label === r[target]).length / rows.length;
}

export function avgQuestions(tree, rows) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + classify(tree, r).path.length, 0) / rows.length;
}

export function treeSize(tree) {
  return tree.leaf ? { nodes: 1, leaves: 1, depth: 0 } : (() => {
    const a = treeSize(tree.yes), b = treeSize(tree.no);
    return { nodes: 1 + a.nodes + b.nodes, leaves: a.leaves + b.leaves, depth: 1 + Math.max(a.depth, b.depth) };
  })();
}
