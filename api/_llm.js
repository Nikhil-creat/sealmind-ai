// Auto-detecting LLM gateway. Provider is detected from the key prefix (gsk_ = Groq, AIza = Gemini),
// the model is auto-selected from the provider's live model list, and a bad model triggers a re-detect.
const hits = new Map(), cache = new Map();
export function limited(req, max = 20, windowMs = 60000) {
  const ip = (req.headers["x-forwarded-for"] || "anon").split(",")[0].trim(), now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs); arr.push(now); hits.set(ip, arr);
  return arr.length > max;
}
export function detect(k) { k = (k || "").trim(); return k.startsWith("gsk_") ? "groq" : k.startsWith("AIza") ? "gemini" : null; }
// Order: the visitor's own key first (BYOK, never stored or logged), then every server key found in env.
export function keyring(req) {
  const list = [], add = (k, src) => { k = (k || "").trim(); const p = detect(k); if (p && !list.some((x) => x.key === k)) list.push({ p, key: k, src }); };
  add(req?.headers?.["x-user-key"], "your key");
  [process.env.GROQ_API_KEY, process.env.GEMINI_API_KEY, process.env.AI_API_KEY].forEach((k) => add(k, "server"));
  return list;
}
const PREF = {
  groq: [/llama-3\.3-70b/, /llama-3\.1-70b/, /llama-3\.1-8b/, /qwen|gemma|mixtral|llama/],
  gemini: [/^gemini-2\.5-flash$/, /^gemini-2\.0-flash$/, /^gemini-1\.5-flash/, /flash/]
};
export async function pickModel(p, key, force = false) {
  const c = cache.get(key);
  if (c && !force && Date.now() - c.t < 3600e3) return c.model;
  let ids;
  if (p === "groq") {
    const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + key } });
    if (!r.ok) throw new Error("groq models " + r.status);
    ids = (await r.json()).data.map((m) => m.id).filter((id) => !/whisper|guard|tts|playai|distil|prompt/i.test(id));
  } else {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=" + key);
    if (!r.ok) throw new Error("gemini models " + r.status);
    ids = ((await r.json()).models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace("models/", "")).filter((id) => !/tts|image|embed|thinking|live|preview|exp|robotics/i.test(id));
  }
  const model = (p === "groq" && process.env.GROQ_MODEL) || (p === "gemini" && process.env.GEMINI_MODEL) || PREF[p].map((re) => ids.find((id) => re.test(id))).find(Boolean) || ids[0];
  if (!model) throw new Error(p + ": no usable model");
  cache.set(key, { model, t: Date.now() });
  return model;
}
async function run(p, key, model, system, messages, json) {
  if (p === "groq") {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 900, messages: [{ role: "system", content: system }, ...messages], ...(json ? { response_format: { type: "json_object" } } : {}) })
    });
    if (!r.ok) throw new Error("groq " + r.status);
    return (await r.json()).choices[0].message.content;
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: messages.map((x) => ({ role: x.role === "assistant" ? "model" : "user", parts: [{ text: x.content }] })), generationConfig: { temperature: 0.3, maxOutputTokens: 900, ...(json ? { responseMimeType: "application/json" } : {}) } })
  });
  if (!r.ok) throw new Error("gemini " + r.status);
  return (await r.json()).candidates[0].content.parts[0].text;
}
export async function llm(req, system, messages, { json = false } = {}) {
  const ring = keyring(req);
  if (!ring.length) throw new Error("No API key found. Paste a Groq or Gemini key under Key, or set GROQ_API_KEY / GEMINI_API_KEY on Vercel.");
  const errs = [];
  for (const { p, key, src } of ring) {
    for (let i = 0; i < 2; i++) {
      try {
        const model = await pickModel(p, key, i > 0);
        const text = await run(p, key, model, system, messages, json);
        return { text, provider: p === "groq" ? "Groq" : "Gemini", model, source: src };
      } catch (e) { errs.push(p + ": " + e.message); if (!/\b(400|404)\b|model/i.test(e.message)) break; }
    }
  }
  throw new Error(errs.join(" | "));
}
