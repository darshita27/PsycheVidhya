const express = require("express");
const { body, param, validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const { requireAdmin } = require("../middleware/auth");
const { formLimiter } = require("../middleware/rateLimiters");
const { isDbConnected } = require("../config/db");
const { sendEmail, bookingClientEmail, bookingAdminEmail } = require("../utils/email");

const router = express.Router();

const createValidators = [
  body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Please enter your full name."),
  body("email").trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body("service").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body("preferredDate").optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body("preferredTime").optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body("message").optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

// POST /api/bookings — public: submit a session request
router.post("/", formLimiter, createValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        error: "Booking is temporarily unavailable. Please email vanupriyasingh28@gmail.com directly.",
      });
    }

    const { name, email, phone, service, preferredDate, preferredTime, message } = req.body;
    const booking = await Booking.create({
      name,
      email,
      phone,
      service: service || "Not sure yet",
      preferredDate,
      preferredTime,
      message,
    });

    const clientMail = bookingClientEmail(booking);
    const adminMail = bookingAdminEmail(booking);
    const adminEmail = process.env.ADMIN_EMAIL || "vanupriyasingh28@gmail.com";

    // Fire-and-forget: a slow/broken SMTP provider should never block the booking response.
    sendEmail({ to: booking.email, ...clientMail }).catch(() => {});
    sendEmail({ to: adminEmail, ...adminMail }).catch(() => {});

    res.status(201).json({
      message: "Your session request has been received. You'll hear back by email shortly.",
      booking: { id: booking._id, status: booking.status },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings — admin only: list all bookings, newest first
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    if (!isDbConnected()) return res.json({ bookings: [] });
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(500);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id — admin only: update status
router.patch(
  "/:id",
  requireAdmin,
  [
    param("id").isMongoId(),
    body("status").isIn(["pending", "confirmed", "completed", "cancelled"]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Invalid request." });
      }

      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { returnDocument: "after" }
      );
      if (!booking) return res.status(404).json({ error: "Booking not found." });
      res.json({ booking });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/bookings/:id — admin only
router.delete("/:id", requireAdmin, [param("id").isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid request." });

    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
