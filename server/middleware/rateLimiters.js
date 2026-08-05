const rateLimit = require("express-rate-limit");

// Chat proxy calls a paid OpenAI API — keep this tight.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment and try again." },
});

// Booking/contact forms are public-facing — protect against spam without blocking real visitors.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

// Login is the most sensitive public endpoint — throttle hardest.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

module.exports = { chatLimiter, formLimiter, loginLimiter };
