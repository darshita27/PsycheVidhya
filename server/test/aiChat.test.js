const test = require("node:test");
const assert = require("node:assert/strict");

test("getProvider() prefers Groq, then Gemini, then OpenAI", () => {
  delete require.cache[require.resolve("../utils/aiChat")];
  const { getProvider } = require("../utils/aiChat");

  const saved = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  try {
    process.env.GROQ_API_KEY = "fake";
    process.env.GEMINI_API_KEY = "fake";
    process.env.OPENAI_API_KEY = "fake";
    assert.equal(getProvider(), "groq");

    delete process.env.GROQ_API_KEY;
    assert.equal(getProvider(), "gemini");

    delete process.env.GEMINI_API_KEY;
    assert.equal(getProvider(), "openai");

    delete process.env.OPENAI_API_KEY;
    assert.equal(getProvider(), null);
  } finally {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  }
});
