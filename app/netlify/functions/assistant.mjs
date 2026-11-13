// RecyBot-Assistent: leitet Fragen an ein Sprachmodell weiter.
// Der API-Schlüssel bleibt auf dem Server (Netlify-Umgebungsvariable), nie im Browser.
//
// Umgebungsvariablen (eine davon genügt):
//   GROQ_API_KEY       → Groq, kostenlos ohne Kreditkarte, speichert Anfragen standardmäßig nicht (empfohlen)
//   ANTHROPIC_API_KEY  → Claude (kostenpflichtig)
//   OPENAI_API_KEY     → OpenAI (kostenpflichtig)
//   GEMINI_API_KEY     → Google Gemini (im Gratis-Zugang dürfen Daten zum Training genutzt werden)
// Optional: AI_PROVIDER (groq | anthropic | openai | gemini), AI_MODEL (Modellname überschreiben)

const DEFAULT_MODEL = { groq: "llama-3.3-70b-versatile", anthropic: "claude-haiku-5-5", openai: "gpt-4.1-mini", gemini: "gemini-2.5-flash" };
// Wenn das große Gratis-Modell sein Tageslimit erreicht hat, weicht Groq auf das kleine aus.
const GROQ_FALLBACK = "llama-3.1-8b-instant";
const MODULES = {
  label: { de: "LabelLab: Die Lernenden ziehen Rahmen um Verpackungen auf einem Förderband und vergeben Materialien. Mit genau diesen Labels wird ein kNN-Klassifikator trainiert und an neuen Verpackungen getestet (Datenqualität).", en: "LabelLab: learners draw boxes around packages on a conveyor belt and assign materials. A kNN classifier is trained on exactly these labels and tested on new packages (data quality)." },
  tycoon: { de: "Lifecycle Tycoon: Die Lernenden entwerfen einen Wasserkocher (Material, Verbindung, Aufbau) und balancieren Recycling, Reparierbarkeit, Haltbarkeit, Preis und CO₂. Score = 60 % Durchschnitt + 40 % schwächster Wert; Pareto-Front.", en: "Lifecycle Tycoon: learners design a kettle (material, joints, construction) and balance recycling, repairability, durability, price and CO₂. Score = 60 % average + 40 % weakest value; Pareto front." },
  routes: { de: "Reverse Logistics: Die Lernenden planen eine Sammeltour und vergleichen sie mit Nächster-Nachbar, 2-opt und exakter Suche (bis 8 Stopps). Thema: Heuristiken und kombinatorische Explosion.", en: "Reverse Logistics: learners plan a collection round and compare it with nearest neighbour, 2-opt and exact search (up to 8 stops). Topic: heuristics and combinatorial explosion." },
  green: { de: "GreenAI Lab: Die Lernenden trainieren echte neuronale Netze (mini, mittel, riesig) auf NIR-Sensordaten für PET, PP, PS, PVC. Ziel ≥ 90 % Genauigkeit innerhalb von 20 kJ Energiebudget; Kennzahl Genauigkeit pro kJ.", en: "GreenAI Lab: learners train real neural networks (mini, medium, huge) on NIR sensor data for PET, PP, PS, PVC. Goal ≥ 90 % accuracy within a 20 kJ energy budget; metric accuracy per kJ." },
  capstone: { de: "Capstone: Die Ergebnisse der Module 1 bis 8 bilden eine Stadt mit Kreislaufquote, CO₂ und Zufriedenheit. Kettenreaktionen zeigen Zusammenhänge; ein Transfer-Quiz prüft die Übertragung auf neue Kontexte. Quizantworten nicht verraten.", en: "Capstone: the results of modules 1 to 8 form a city with circularity, CO₂ and satisfaction. Chain reactions show connections; a transfer quiz checks application to new contexts. Do not reveal quiz answers." },
  line: { de: "Line Controller: Eine Bilderkennung meldet, wie sicher ein Gegenstand PET ist. Die Lernenden wählen einen Schwellwert und vergleichen Precision und Recall mit den Zielen eines Szenarios.", en: "Line Controller: an image classifier reports how confident it is that an item is PET. Learners choose a threshold and compare precision and recall with a scenario's targets." },
  repair: { de: "Repair Lab: Die Lernenden diagnostizieren ein Handy, das nicht lädt, mit möglichst wenigen Ja/Nein-Fragen. Ein Entscheidungsbaum (ID3, Informationsgewinn) aus 48 Werkstattfällen dient als Vergleich. Gehäuse aufhebeln zerstört das Gerät.", en: "Repair Lab: learners diagnose a phone that won't charge with as few yes/no questions as possible. A decision tree (ID3, information gain) trained on 48 repair cases is the comparison. Prying open the case destroys the device." },
  policy: { de: "Policy Simulator: Die Lernenden steuern sechs Jahre Abfallpolitik einer Stadt (Pfand, Container, Kampagne, Reparaturcafés) mit begrenztem Budget. Ziele: Recyclingquote und Zufriedenheit. Themen: Verzögerung, Rückkopplung, Korrelation vs. Kausalität.", en: "Policy Simulator: learners run six years of a city's waste policy (deposit, bins, campaign, repair cafés) on a limited budget. Goals: recycling rate and satisfaction. Topics: delay, feedback, correlation vs. causation." },
  sprint: { de: "Data Sprint: Die Lernenden markieren Müll auf Fotos (Citizen Science), vergleichen mit einem Goldstandard und trainieren damit einen Klassifikator. Die Fotos stammen überwiegend aus der Stadt, deshalb ist die KI am Waldrand schlecht (Bias), bis Waldfotos ergänzt werden.", en: "Data Sprint: learners tag litter on photos (citizen science), compare with a gold standard and train a classifier with it. Most photos come from the city, so the AI performs poorly at the forest edge (bias) until forest photos are added." }
};

const LIMITS = { messages: 8, chars: 400, facts: 12, factChars: 300 };
const hits = new Map(); // einfache Drosselung pro IP und Instanz

function systemPrompt(module, lang, facts, hint) {
  const de = lang === "de";
  return [
    de ? "Du bist RecyBot, ein freundlicher Lernbegleiter in einem Lernspiel über KI und Kreislaufwirtschaft für Schülerinnen und Schüler (12 bis 18 Jahre)."
       : "You are RecyBot, a friendly learning companion in a game about AI and the circular economy for school students aged 12 to 18.",
    de ? "Antworte immer auf Deutsch, in einfachen Sätzen, höchstens 90 Wörter." : "Always answer in English, in simple sentences, at most 90 words.",
    de ? "Arbeite sokratisch: Gib einen konkreten Denkanstoß zum aktuellen Spielstand und stelle am Ende eine kurze Rückfrage. Verrate keine Lösung, die das Spiel die Lernenden selbst finden lässt."
       : "Work Socratically: give one concrete nudge about the current game state and end with a short question. Do not give away a solution the game wants learners to find themselves.",
    de ? "Erfinde keine Zahlen. Nutze nur die Fakten unten. Wenn dir etwas fehlt, sag es." : "Do not invent numbers. Use only the facts below. If something is missing, say so.",
    de ? "Bleib beim Thema des Moduls. Bei anderen Themen lenke freundlich zurück. Frag nie nach Namen oder persönlichen Daten. Wenn jemand von persönlichen Problemen oder Gefahr erzählt, antworte kurz und freundlich und empfiehl, mit einer Lehrkraft oder einer Vertrauensperson zu sprechen."
       : "Stay on the module's topic and kindly steer back from other topics. Never ask for names or personal data. If someone mentions personal problems or danger, reply briefly and kindly and suggest talking to a teacher or another trusted adult.",
    "",
    (de ? "Modul: " : "Module: ") + MODULES[module][lang],
    de ? "Aktueller Spielstand:" : "Current game state:",
    ...facts.map(f => "- " + f),
    hint ? (de ? "Berechneter Hinweis der Spiellogik (verlässlich, darfst du nutzen): " : "Computed hint from the game logic (reliable, you may use it): ") + hint : ""
  ].join("\n");
}

const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F]/g, " ").slice(0, n);

export function validate(body) {
  if (!body || typeof body !== "object") throw new Error("bad_request");
  const module = body.module, lang = body.lang === "en" ? "en" : "de";
  if (!MODULES[module]) throw new Error("bad_module");
  const facts = (Array.isArray(body.facts) ? body.facts : []).slice(0, LIMITS.facts).map(f => clean(f, LIMITS.factChars));
  const hint = clean(body.hint, 600);
  const raw = Array.isArray(body.messages) ? body.messages.slice(-LIMITS.messages) : [];
  const messages = raw.filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: clean(m.content, m.role === "user" ? LIMITS.chars : 900) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") throw new Error("bad_messages");
  return { module, lang, facts, hint, messages };
}

export function pickProvider(env) {
  const forced = (env.AI_PROVIDER || "").toLowerCase();
  const keys = { groq: env.GROQ_API_KEY, anthropic: env.ANTHROPIC_API_KEY, openai: env.OPENAI_API_KEY, gemini: env.GEMINI_API_KEY };
  const provider = keys[forced] ? forced : ["groq", "anthropic", "openai", "gemini"].find(p => keys[p]);
  if (!provider) return null;
  return { provider, key: keys[provider], model: env.AI_MODEL || DEFAULT_MODEL[provider] };
}

export async function callModel({ provider, key, model }, system, messages, fetchFn = fetch) {
  const signal = AbortSignal.timeout(20000);
  if (provider === "anthropic") {
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 350, temperature: 0.4, system, messages })
    });
    if (!r.ok) throw new Error("upstream_" + r.status);
    const d = await r.json();
    return (d.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
  }
  if (provider === "openai" || provider === "groq") {
    // Groq nutzt dasselbe Format wie OpenAI
    const url = provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const send = m => fetchFn(url, {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ model: m, max_tokens: 350, temperature: 0.4, messages: [{ role: "system", content: system }, ...messages] })
    });
    let r = await send(model);
    if (r.status === 429 && provider === "groq" && model !== GROQ_FALLBACK) r = await send(GROQ_FALLBACK);
    if (!r.ok) throw new Error("upstream_" + r.status);
    const d = await r.json();
    return (d.choices?.[0]?.message?.content || "").trim();
  }
  const r = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 350, temperature: 0.4 }
    })
  });
  if (!r.ok) throw new Error("upstream_" + r.status);
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
}

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async function handler(req, context) {
  if (req.method !== "POST") return json(405, { error: "method" });
  const cfg = pickProvider(process.env);
  if (!cfg) return json(503, { error: "no_key" });
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "anon";
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (list.length >= 20) return json(429, { error: "rate_limited" });
  hits.set(ip, [...list, now]);
  let input;
  try { input = validate(await req.json()); } catch (e) { return json(400, { error: e.message }); }
  try {
    const text = await callModel(cfg, systemPrompt(input.module, input.lang, input.facts, input.hint), input.messages);
    if (!text) return json(502, { error: "empty" });
    return json(200, { text, provider: cfg.provider });
  } catch (e) {
    return json(502, { error: String(e.message || e).slice(0, 60) });
  }
}

export const config = { path: "/api/assistant" };
export { systemPrompt };
