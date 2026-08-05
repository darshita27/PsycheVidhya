const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    type: { type: String, enum: ["contact", "screener-share"], default: "contact" },
    screenerScore: { type: Number, min: 0, max: 27 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
