import { describe, expect, it } from "vitest";
import { confusion, iou, matchBoxes } from "./metrics.js";
import { KNN, cosine, evaluate } from "./knn.js";
import { accuracy, avgQuestions, buildTree, classify, entropy, infoGain } from "./id3.js";
import { FAULTS, FEATURES, makeCases } from "./repairData.js";
import { bruteForce, closedTour, crossings, factorial, nearestNeighbour, tourLength, twoOpt } from "./tsp.js";
import { allVariants, evaluate as evalTycoon, paretoFront } from "./tycoon.js";
import { initialState, optimise, runPolicy, step, yearCost } from "./policy.js";
import { energyKJ, makeDataset, paramCount } from "./nir.js";
import { computeCity } from "./city.js";
import { rng } from "./rng.js";

describe("metrics", () => {
  const items = [{ score: 90, pet: true }, { score: 80, pet: false }, { score: 40, pet: true }, { score: 10, pet: false }];
  it("confusion matrix at threshold 50", () => {
    const c = confusion(items, 50);
    expect([c.tp, c.fp, c.fn, c.tn]).toEqual([1, 1, 1, 1]);
    expect(c.precision).toBe(0.5);
    expect(c.recall).toBe(0.5);
  });
  it("precision is null when nothing is predicted positive", () => {
    expect(confusion(items, 100).precision).toBeNull();
  });
  it("higher threshold never lowers precision here, but lowers recall", () => {
    const lo = confusion(items, 30), hi = confusion(items, 85);
    expect(hi.precision).toBeGreaterThanOrEqual(lo.precision);
    expect(hi.recall).toBeLessThanOrEqual(lo.recall);
  });
  it("iou", () => {
    expect(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(1);
    expect(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBe(0);
  });
  it("matchBoxes assigns each box once", () => {
    const truth = [{ x: 0, y: 0, w: 10, h: 10, cls: "a" }, { x: 50, y: 0, w: 10, h: 10, cls: "b" }];
    const boxes = [{ x: 1, y: 1, w: 10, h: 10, cls: "a" }, { x: 2, y: 0, w: 10, h: 10, cls: "a" }];
    const { res, extra } = matchBoxes(truth, boxes);
    expect(res.map(r => r.status)).toEqual(["ok", "missed"]);
    expect(extra).toBe(1);
  });
});

describe("kNN", () => {
  it("cosine of identical vectors is 1", () => expect(cosine([1, 2], [1, 2])).toBeCloseTo(1));
  it("classifies by nearest neighbours", () => {
    const m = new KNN(1).add([1, 0], "x").add([0, 1], "y");
    expect(m.predict([0.9, 0.1]).label).toBe("x");
    expect(evaluate(m, [{ vec: [0, 2], label: "y" }]).accuracy).toBe(1);
  });
  it("empty model predicts null", () => expect(new KNN().predict([1]).label).toBeNull());
});

describe("ID3 decision tree", () => {
  it("entropy of pure set is 0, of 50/50 is 1", () => {
    expect(entropy([{ t: "a" }, { t: "a" }], "t")).toBe(0);
    expect(entropy([{ t: "a" }, { t: "b" }], "t")).toBe(1);
  });
  it("information gain finds the perfect split", () => {
    const rows = [{ f: true, g: true, t: "a" }, { f: true, g: false, t: "a" }, { f: false, g: true, t: "b" }, { f: false, g: false, t: "b" }];
    expect(infoGain(rows, "f", "t")).toBe(1);
    expect(infoGain(rows, "g", "t")).toBe(0);
    expect(buildTree(rows, ["f", "g"], "t").attr).toBe("f");
  });
  it("more training cases help (seed used in the app)", () => {
    const all = makeCases(84, 14), pool = all.slice(0, 48), test = all.slice(48);
    const acc = n => accuracy(buildTree(pool.slice(0, n), FEATURES, "fault"), test, "fault");
    expect(acc(12)).toBeLessThan(acc(24));
    expect(acc(24)).toBeLessThan(acc(48));
    expect(acc(48)).toBeGreaterThan(0.85);
  });
  it("learns repair cases well and generalises", () => {
    const rows = makeCases(120, 3);
    const train = rows.slice(0, 90), test = rows.slice(90);
    const tree = buildTree(train, FEATURES, "fault");
    expect(accuracy(tree, train, "fault")).toBeGreaterThan(0.8);
    expect(accuracy(tree, test, "fault")).toBeGreaterThan(0.6);
    expect(avgQuestions(tree, test)).toBeLessThan(FEATURES.length);
    expect(FAULTS).toContain(classify(tree, test[0]).label);
  });
});

describe("TSP", () => {
  const depot = [0, 0];
  const stops = [[10, 0], [10, 10], [0, 10], [5, 5], [2, 8]];
  it("factorial", () => expect(factorial(5)).toBe(120));
  it("2-opt never makes the tour longer", () => {
    const nn = nearestNeighbour(depot, stops);
    const { order } = twoOpt(depot, stops, nn);
    expect(tourLength(closedTour(depot, stops, order))).toBeLessThanOrEqual(tourLength(closedTour(depot, stops, nn)) + 1e-9);
  });
  it("brute force is optimal and the heuristic is close", () => {
    const exact = bruteForce(depot, stops);
    expect(exact.checked).toBe(120);
    const { order } = twoOpt(depot, stops, nearestNeighbour(depot, stops));
    const heur = tourLength(closedTour(depot, stops, order));
    expect(heur).toBeGreaterThanOrEqual(exact.len - 1e-9);
    expect(heur / exact.len).toBeLessThan(1.1);
  });
  it("brute force refuses large instances", () => expect(bruteForce(depot, Array(10).fill([1, 1]))).toBeNull());
  it("detects a crossing", () => {
    expect(crossings([[0, 0], [10, 10], [10, 0], [0, 10], [0, 0]])).toBeGreaterThan(0);
    expect(crossings([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]])).toBe(0);
  });
});

describe("Lifecycle Tycoon", () => {
  it("27 variants, at least one earns the badge", () => {
    const v = allVariants();
    expect(v).toHaveLength(27);
    expect(v.some(x => x.badge)).toBe(true);
  });
  it("fully modular is too expensive for the badge", () => {
    expect(evalTycoon({ material: "steel", joint: "screws", build: "modular" }).badge).toBe(false);
  });
  it("pareto front is non-empty and non-dominated", () => {
    const v = allVariants(), front = paretoFront(v);
    expect(front.length).toBeGreaterThan(0);
    front.forEach(f => expect(v.some(w => w.eco > f.eco && w.price < f.price)).toBe(false));
  });
  it("throws on invalid choice", () => expect(() => evalTycoon({ material: "x", joint: "glued", build: "block" })).toThrow());
});

describe("Policy simulator", () => {
  it("a balanced policy can reach all goals", () => {
    const { final } = runPolicy({ deposit: 0.4, containers: 100, campaign: 2, repair: 1 });
    expect(final.R).toBeGreaterThanOrEqual(65);
    expect(final.S).toBeGreaterThanOrEqual(60);
    expect(final.budget).toBeGreaterThanOrEqual(0);
  });
  it("spending everything breaks the budget", () => {
    expect(runPolicy({ deposit: 0.5, containers: 150, campaign: 3, repair: 3 }).final.budget).toBeLessThan(0);
  });
  it("containers act with a delay", () => {
    const s0 = initialState();
    const a = step(s0, { deposit: 0, containers: 0, campaign: 0, repair: 0 });
    const b = step(s0, { deposit: 0, containers: 150, campaign: 0, repair: 0 });
    expect(b.R).toBe(a.R);                         // gleiches Jahr: kein Effekt
    const a2 = step(a, { deposit: 0, containers: 0, campaign: 0, repair: 0 });
    const b2 = step(b, { deposit: 0, containers: 0, campaign: 0, repair: 0 });
    expect(b2.R).toBeGreaterThan(a2.R);            // Folgejahr: Effekt
  });
  it("the optimiser respects the budget and follows its weights", () => {
    const quota = optimise({ R: 1, S: 0 }), happy = optimise({ R: 0, S: 1 });
    expect(quota.final.budget).toBeGreaterThanOrEqual(0);
    expect(quota.final.R).toBeGreaterThanOrEqual(happy.final.R);
    expect(happy.final.S).toBeGreaterThanOrEqual(quota.final.S);
    expect(yearCost({ containers: 100, campaign: 2, repair: 1 })).toBeCloseTo(1.2);
  });
});

describe("NIR dataset and energy", () => {
  it("is reproducible and balanced", () => {
    const a = makeDataset(400, 3), b = makeDataset(400, 3);
    expect(a.train[0].x).toEqual(b.train[0].x);
    expect(a.train.length + a.test.length).toBe(400);
  });
  it("bigger models cost more energy", () => {
    expect(paramCount([4])).toBe(56);
    expect(energyKJ(paramCount([128, 128, 128]), 10)).toBeGreaterThan(energyKJ(paramCount([16, 16]), 10) * 50);
  });
  it("rng is deterministic", () => expect(rng(5)()).toBe(rng(5)()));
});

describe("Capstone city", () => {
  it("empty results give neutral open city", () => {
    const c = computeCity({});
    expect(c.tiles.label.status).toBe("open");
    expect(c.chains).toHaveLength(0);
  });
  it("composite material triggers a chain reaction", () => {
    const c = computeCity({ tycoon: { material: "composite", score: 50 }, line: { prec: 95 } });
    expect(c.chains.map(x => x.id)).toContain("composite");
    expect(c.tiles.line.status).toBe("bad");
  });
  it("values stay in range", () => {
    const c = computeCity({ label: { acc: 1 }, line: { prec: 100 }, tycoon: { material: "steel", score: 100, badge: true }, repair: { solved: true }, routes: { overhead: 0 }, policy: { R: 100, S: 100, goals: true }, sprint: { dev: 0, diversified: true }, green: { model: "medium", apj: 1 } });
    expect(c.circ).toBeLessThanOrEqual(100);
    expect(c.co2).toBeGreaterThanOrEqual(-40);
  });
});

// ---------- Studie: Statistik, Test, Ergebnisdatei ----------
import { mean, sd, tTwoSidedP, pairedTTest, effectLabel } from "./stats.js";
import { TEST_ITEMS, SURVEY_ITEMS, scoreTest, surveyScales } from "./assessment.js";
import { buildRecord, encodeRecord, decodeRecord } from "../lib/record.js";

describe("stats", () => {
  it("mean and sd", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
  it("t distribution p-values match tables", () => {
    expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(2.0, 10)).toBeCloseTo(0.0734, 3);
    expect(tTwoSidedP(0, 5)).toBeCloseTo(1, 6);
  });
  it("paired t-test", () => {
    const pre = [50, 42, 58, 33, 67, 50], post = [67, 58, 75, 42, 75, 58];
    const r = pairedTTest(pre, post);
    expect(r.n).toBe(6);
    expect(r.meanDiff).toBeCloseTo(12.5, 6);
    expect(r.p).toBeLessThan(0.01);
    expect(effectLabel(r.d)).toBe("large");
  });
});

describe("assessment", () => {
  it("has balanced, well-formed items", () => {
    expect(TEST_ITEMS.length).toBe(12);
    expect(TEST_ITEMS.filter(i => i.dim === "ai").length).toBe(6);
    const positions = new Set(TEST_ITEMS.map(i => i.a));
    expect(positions.size).toBe(4); // richtige Antwort nicht immer an derselben Stelle
    for (const it of TEST_ITEMS) for (const l of ["de", "en"]) expect(it[l][1].length).toBe(4);
  });
  it("scores answers", () => {
    const all = scoreTest(TEST_ITEMS.map(i => i.a));
    expect(all.pct).toBe(100);
    expect(scoreTest([]).total).toBe(0);
    expect(surveyScales({ int1: 4, int2: 5, int3: 3, use1: 5, load1: 2 }).interest).toBe(4);
    expect(SURVEY_ITEMS.length).toBe(5);
  });
});

describe("record", () => {
  it("round-trips through a code and recomputes scores", () => {
    const rec = buildRecord({
      study: { code: "Fuchs-7", pre: { answers: TEST_ITEMS.map(() => 0), at: 1 }, post: { answers: TEST_ITEMS.map(i => i.a), at: 2 }, survey: { int1: 5 } },
      results: { label: { acc: 0.9, aiAcc: 0.83, at: 5 }, evil: { x: 1 } }, progress: { label: true }, lang: "de"
    });
    const back = decodeRecord(encodeRecord(rec));
    expect(back.code).toBe("Fuchs-7");
    expect(back.post.pct).toBe(100);
    expect(back.pre.total).toBe(TEST_ITEMS.filter(i => i.a === 0).length);
    expect(back.modules.label.acc).toBe(0.9);
    expect(back.modules.evil).toBeUndefined();
    expect(decodeRecord(JSON.stringify(rec)).code).toBe("Fuchs-7");
  });
  it("rejects foreign data", () => {
    expect(() => decodeRecord('{"app":"other"}')).toThrow();
    expect(() => decodeRecord("nonsense")).toThrow();
  });
});
