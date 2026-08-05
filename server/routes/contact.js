const express = require("express");
const { body, param, validationResult } = require("express-validator");
const ContactMessage = require("../models/ContactMessage");
const { requireAdmin } = require("../middleware/auth");
const { formLimiter } = require("../middleware/rateLimiters");
const { isDbConnected } = require("../config/db");
const { sendEmail } = require("../utils/email");

const router = express.Router();

const createValidators = [
  body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Please enter your name."),
  body("email").trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("message").trim().isLength({ min: 5, max: 4000 }).withMessage("Please enter a message."),
  body("type").optional().isIn(["contact", "screener-share"]),
  body("screenerScore").optional({ checkFalsy: true }).isInt({ min: 0, max: 27 }),
];

// POST /api/contact — public: general message, or "share my screener results" from the mental health check
router.post("/", formLimiter, createValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        error: "Messaging is temporarily unavailable. Please email vanupriyasingh28@gmail.com directly.",
      });
    }

    const { name, email, message, type, screenerScore } = req.body;
    const doc = await ContactMessage.create({
      name,
      email,
      message,
      type: type || "contact",
      screenerScore: type === "screener-share" ? screenerScore : undefined,
    });

    const adminEmail = process.env.ADMIN_EMAIL || "vanupriyasingh28@gmail.com";
    sendEmail({
      to: adminEmail,
      subject: type === "screener-share" ? "Screener results shared by a visitor" : `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }).catch(() => {});

    res.status(201).json({ message: "Thank you — your message has been sent.", id: doc._id });
  } catch (err) {
    next(err);
  }
});

// GET /api/contact — admin only
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    if (!isDbConnected()) return res.json({ messages: [] });
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(500);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/contact/:id/read — admin only
router.patch("/:id/read", requireAdmin, [param("id").isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid request." });

    const doc = await ContactMessage.findByIdAndUpdate(req.params.id, { read: true }, { returnDocument: "after" });
    if (!doc) return res.status(404).json({ error: "Message not found." });
    res.json({ message: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
