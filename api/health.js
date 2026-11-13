import { keyring, pickModel } from "./_llm.js";
export default async function handler(req, res) {
  const out = [];
  for (const { p, key } of keyring({ headers: {} })) {
    try { out.push({ provider: p === "groq" ? "Groq" : "Gemini", model: await pickModel(p, key) }); }
    catch (e) { out.push({ provider: p, error: e.message }); }
  }
  res.status(200).json({ ready: out.some((x) => x.model), providers: out });
}
