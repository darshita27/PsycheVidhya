const OpenAI = require("openai");

const SYSTEM_PROMPT =
  "You are a supportive mental health assistant for PsycheVidhya, a psychology practice. " +
  "Be empathetic, calm, and concise (2-4 sentences). Never claim to be a replacement for " +
  "professional care, and if the user mentions self-harm, suicide, or being in danger, " +
  "gently urge them to contact local emergency services or a crisis helpline immediately.";

// Priority: Groq and Gemini both have generous free tiers; OpenAI is kept only
// for backward compatibility if someone already has a key set.
function getProvider() {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

let openaiCompatClient = null;
let openaiCompatProvider = null;

function getOpenAICompatClient(provider) {
  if (openaiCompatClient && openaiCompatProvider === provider) return openaiCompatClient;

  openaiCompatClient =
    provider === "groq"
      ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
      : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  openaiCompatProvider = provider;
  return openaiCompatClient;
}

async function chatViaOpenAICompat(provider, message) {
  const client = getOpenAICompatClient(provider);
  const model =
    provider === "groq" ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile" : "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
  });
  return response.choices?.[0]?.message?.content || null;
}

async function chatViaGemini(message) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function getChatReply(message) {
  const provider = getProvider();
  if (!provider) {
    const err = new Error("No AI provider configured");
    err.code = "NO_PROVIDER";
    throw err;
  }
  return provider === "gemini" ? chatViaGemini(message) : chatViaOpenAICompat(provider, message);
}

module.exports = { getChatReply, getProvider };
