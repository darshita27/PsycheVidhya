// One-off script to create (or reset the password of) the admin account.
// Usage: node server/seedAdmin.js <email> <password>
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const Admin = require("./models/Admin");

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Usage: node server/seedAdmin.js <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  const conn = await connectDB();
  if (!conn) {
    console.error("Could not connect to MongoDB — see the error above.");
    process.exit(1);
  }

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash, name: "Vanupriya Singh" },
    { upsert: true, returnDocument: "after" }
  );

  console.log(`Admin account ready: ${admin.email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
