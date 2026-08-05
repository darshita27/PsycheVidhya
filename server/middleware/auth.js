const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set — refusing to verify tokens.");
    return res.status(500).json({ error: "Server auth misconfigured." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

module.exports = { requireAdmin };
