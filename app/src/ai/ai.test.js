import { describe, expect, it } from "vitest";
import { classifyQuestion, describeContext, offlineReply } from "./tutor.js";
import { callModel, pickProvider, systemPrompt, validate } from "../../netlify/functions/assistant.mjs";

const line = { scen: "quality", scenName: "Hochwertige Anlage", targetP: 95, targetR: 40, threshold: 50, prec: 80, rec: 90, n: 12, nPet: 7, tp: 6, fp: 2, fn: 1, tn: 3, enough: true };

describe("offline tutor", () => {
  it("line: points at the failing metric", () => {
    expect(offlineReply("line", "hint", line, "de")).toMatch(/Precision liegt bei 80 %/);
    expect(offlineReply("line", "hint", { ...line, prec: 96, rec: 30 }, "en")).toMatch(/Recall is 30 %/);
    expect(offlineReply("line", "hint", { ...line, enough: false }, "de")).toMatch(/mindestens sechs/);
    expect(offlineReply("line", "explain", line, "de")).toMatch(/6 von 8/);
  });
  it("repair: never names the hidden fault, suggests the best question", () => {
    const ctx = { round: 0, rounds: 3, asked: [], best: "Leuchtet die Ladeanzeige?", nLeft: 48, confident: false, outcome: null };
    expect(offlineReply("repair", "hint", ctx, "de")).toMatch(/Ladeanzeige/);
    expect(offlineReply("repair", "hint", { ...ctx, outcome: "broken" }, "en")).toMatch(/wasn't necessary/);
  });
  it("policy and sprint give stage-appropriate hints", () => {
    const p = { year: 2028, round: 2, rounds: 6, R: 50, S: 52, budget: 5, goalR: 65, goalS: 60, worst: "Hafen", worstS: 40, dR: 4, dS: -3, over: false, goals: false, levers: "" };
    expect(offlineReply("policy", "hint", p, "de")).toMatch(/Hafen/);
    expect(offlineReply("policy", "hint", { ...p, round: 0 }, "de")).toMatch(/Jahr danach/);
    const s = { nPhotos: 5, labeled: 5, avgDev: 20, lastDev: 10, extended: false, trained: true, rates: { city: 100, park: 67, edge: 100, forest: 50 }, shares: { city: 0.6, park: 0.2, edge: 0.2, forest: 0 }, locNames: { city: "Innenstadt", park: "Parks", edge: "Stadtrand", forest: "Waldrand" } };
    expect(offlineReply("sprint", "hint", s, "de")).toMatch(/Waldrand ist die KI nur zu 50 %/);
    expect(describeContext("sprint", s, "de").join(" ")).toMatch(/Waldrand 50 %/);
  });
  it("covers all nine modules with intros and hints", () => {
    for (const m of ["label", "line", "tycoon", "repair", "routes", "policy", "sprint", "green", "capstone"]) {
      expect(offlineReply(m, "intro", null, "de").length).toBeGreaterThan(80);
      expect(offlineReply(m, "intro", null, "en").length).toBeGreaterThan(80);
    }
    expect(offlineReply("label", "hint", { scene: 0, scenes: 3, phase: "label", items: 4, boxes: 4, unlabeled: 0, checked: true, wrong: 1, missed: 0, labelAcc: 0.75 }, "de")).toMatch(/Verbundstoff/);
    expect(offlineReply("tycoon", "hint", { composite: true }, "en")).toMatch(/Composite/);
    expect(offlineReply("routes", "hint", { done: true, overhead: 2, cross: 0 }, "de")).toMatch(/Fast so gut/);
    expect(offlineReply("green", "hint", { runs: 2, lastAcc: 92, left: 10, bestApj: 79.3 }, "de")).toMatch(/79.3 % pro kJ/);
    expect(offlineReply("capstone", "hint", { played: 8, chain: "Warum?" }, "de")).toMatch(/Warum\?/);
    expect(describeContext("green", { runs: 1, lastAcc: 74 }, "de").join()).toMatch(/lastAcc: 74/);
  });
  it("classifies free questions", () => {
    expect(classifyQuestion("Was ist Recall?")).toBe("concept");
    expect(classifyQuestion("Why is my precision low?")).toBe("explain");
    expect(classifyQuestion("hilfe")).toBe("hint");
  });
});

describe("assistant function", () => {
  it("validates and trims input", () => {
    const v = validate({ module: "line", lang: "en", facts: ["a"], messages: [{ role: "assistant", content: "hi" }, { role: "user", content: "x".repeat(2000) }] });
    expect(v.messages).toHaveLength(1);
    expect(v.messages[0].content).toHaveLength(400);
    expect(() => validate({ module: "evil", messages: [{ role: "user", content: "a" }] })).toThrow();
    expect(() => validate({ module: "line", messages: [{ role: "assistant", content: "a" }] })).toThrow();
  });
  it("picks a provider from the available key", () => {
    expect(pickProvider({})).toBeNull();
    expect(pickProvider({ OPENAI_API_KEY: "k" }).provider).toBe("openai");
    expect(pickProvider({ GROQ_API_KEY: "g", ANTHROPIC_API_KEY: "a" }).provider).toBe("groq");
    expect(pickProvider({ GROQ_API_KEY: "g" }).model).toBe("llama-3.3-70b-versatile");
    expect(pickProvider({ ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g", AI_PROVIDER: "gemini" }).provider).toBe("gemini");
    expect(pickProvider({ ANTHROPIC_API_KEY: "a", AI_MODEL: "m" }).model).toBe("m");
  });
  it("speaks each provider's API format", async () => {
    const calls = [];
    const fake = body => async (url, opts) => { calls.push({ url, opts }); return { ok: true, json: async () => body }; };
    const msgs = [{ role: "user", content: "Hilfe" }];
    expect(await callModel({ provider: "anthropic", key: "k", model: "m" }, "S", msgs, fake({ content: [{ type: "text", text: "A" }] }))).toBe("A");
    expect(JSON.parse(calls[0].opts.body).system).toBe("S");
    expect(calls[0].opts.headers["x-api-key"]).toBe("k");
    expect(await callModel({ provider: "openai", key: "k", model: "m" }, "S", msgs, fake({ choices: [{ message: { content: "O" } }] }))).toBe("O");
    expect(JSON.parse(calls[1].opts.body).messages[0].role).toBe("system");
    expect(await callModel({ provider: "gemini", key: "k", model: "m" }, "S", msgs, fake({ candidates: [{ content: { parts: [{ text: "G" }] } }] }))).toBe("G");
    expect(calls[2].opts.headers["x-goog-api-key"]).toBe("k");
  });
  it("groq: OpenAI format, falls back to the small model on 429", async () => {
    const urls = [], models = [];
    let n = 0;
    const fake = async (url, opts) => {
      urls.push(url); models.push(JSON.parse(opts.body).model); n++;
      if (n === 1) return { ok: false, status: 429, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "Q" } }] }) };
    };
    expect(await callModel({ provider: "groq", key: "k", model: "llama-3.3-70b-versatile" }, "S", [{ role: "user", content: "x" }], fake)).toBe("Q");
    expect(urls[0]).toMatch(/api\.groq\.com/);
    expect(models).toEqual(["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]);
  });
  it("puts language, safety and facts into the system prompt", () => {
    const p = systemPrompt("repair", "de", ["Handy 1/3"], "Frag nach der Ladeanzeige");
    expect(p).toMatch(/Antworte immer auf Deutsch/);
    expect(p).toMatch(/persönlichen Daten/);
    expect(p).toMatch(/- Handy 1\/3/);
    expect(p).toMatch(/Ladeanzeige/);
  });
});
