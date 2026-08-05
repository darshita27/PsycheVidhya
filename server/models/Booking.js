const mongoose = require("mongoose");

const SERVICES = [
  "Cognitive Behavioral Therapy",
  "Psychological Testing & Assessment",
  "Psychotherapy & Counselling",
  "Not sure yet",
];

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    service: { type: String, enum: SERVICES, default: "Not sure yet" },
    preferredDate: { type: String, trim: true, maxlength: 40 },
    preferredTime: { type: String, trim: true, maxlength: 40 },
    message: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: STATUSES, default: "pending" },
    source: { type: String, default: "website" },
  },
  { timestamps: true }
);

bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.SERVICES = SERVICES;
module.exports.STATUSES = STATUSES;
