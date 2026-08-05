const dns = require("dns");
const mongoose = require("mongoose");

let hasConnected = false;

mongoose.connection.on("connected", () => console.log("Mongoose: connected"));
mongoose.connection.on("disconnected", () => console.warn("Mongoose: disconnected"));
mongoose.connection.on("reconnected", () => console.log("Mongoose: reconnected"));
mongoose.connection.on("error", (err) => console.error("Mongoose connection error:", err.message));

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      "MONGODB_URI is not set — booking/contact/admin data will not persist. " +
      "Set MONGODB_URI in .env to enable the database."
    );
    return null;
  }

  try {
    await mongoose.connect(uri);
    hasConnected = true;
    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    // mongodb+srv:// requires a DNS SRV lookup, which some networks/containers
    // route to a resolver that can't answer it even though the host is fine.
    // Retry once against a public resolver before giving up.
    const looksLikeDns = /querySrv|queryA|ENOTFOUND|ECONNREFUSED/i.test(error.message);
    if (uri.startsWith("mongodb+srv://") && looksLikeDns) {
      console.warn(
        "MongoDB connection failed via the default DNS resolver, retrying with a public one:",
        error.message
      );
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(uri);
        hasConnected = true;
        console.log("MongoDB connected (via fallback DNS resolver)");
        return mongoose.connection;
      } catch (retryError) {
        console.error("MongoDB connection failed on retry:", retryError.message);
        return null;
      }
    }

    console.error("MongoDB connection failed:", error.message);
    return null;
  }
}

function isDbConnected() {
  return hasConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };
