const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Admin = require("../models/Admin");
const { requireAdmin } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimiters");
const { isDbConnected } = require("../config/db");

const router = express.Router();

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      if (!isDbConnected()) {
        return res.status(503).json({ error: "Admin login is unavailable right now." });
      }

      const { email, password } = req.body;
      const admin = await Admin.findOne({ email });

      // Same generic message whether the email or password was wrong — don't leak which.
      if (!admin || !(await admin.verifyPassword(password))) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "Server auth misconfigured." });
      }

      const token = jwt.sign(
        { sub: admin._id.toString(), email: admin.email, name: admin.name },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
      );

      res.json({ token, admin: { email: admin.email, name: admin.name } });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
