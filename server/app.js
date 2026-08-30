const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

dotenv.config();

const { connectDB, isDbConnected } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const chatRoutes = require("./routes/chat");
const bookingRoutes = require("./routes/bookings");
const contactRoutes = require("./routes/contact");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests (no Origin header) and explicitly allowlisted origins only.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: isDbConnected() ? "connected" : "disconnected" });
});

app.use("/api/chat", chatRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);

// Static frontend + admin dashboard
app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1d" }));
app.use("/admin", express.static(path.join(__dirname, "..", "admin"), { maxAge: "1h" }));

app.use("/api", notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Manova mental wellness server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
