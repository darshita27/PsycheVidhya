const express = require("express");
const { chatLimiter } = require("../middleware/rateLimiters");
const { getChatReply, getProvider } = require("../utils/aiChat");

const router = express.Router();

if (!getProvider()) {
  console.warn(
    "No GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY set — /api/chat will return 503 until one is configured."
  );
}

router.post("/", chatLimiter, async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (userMessage.length > 1000) {
      return res.status(400).json({ error: "Message is too long." });
    }
    if (!getProvider()) {
      return res.status(503).json({ error: "The AI assistant is not configured right now." });
    }

    const reply = await getChatReply(userMessage);
    res.json({ reply: reply || "I'm here with you." });
  } catch (error) {
    console.error("Chat API error:", error.message);
    res.status(500).json({ error: "The AI assistant couldn't respond. Please try again." });
  }
});

module.exports = router;
