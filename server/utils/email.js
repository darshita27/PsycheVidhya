const nodemailer = require("nodemailer");

let transporter = null;
let warned = false;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn(
        "SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will be logged to the console instead of sent."
      );
      warned = true;
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || "Manova Mental Wellness <no-reply@psychevidhya.local>";
  const t = getTransporter();

  if (!t) {
    console.log(`[email:not-configured] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { delivered: false, reason: "smtp-not-configured" };
  }

  try {
    await t.sendMail({ from, to, subject, html, text });
    return { delivered: true };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { delivered: false, reason: error.message };
  }
}

function bookingClientEmail(booking) {
  return {
    subject: "We received your session request — Manova Mental Wellness",
    text:
      `Hi ${booking.name},\n\n` +
      `Thank you for reaching out to Manova Mental Wellness. We've received your request for ` +
      `"${booking.service}"${booking.preferredDate ? ` on ${booking.preferredDate}` : ""}` +
      `${booking.preferredTime ? ` at ${booking.preferredTime}` : ""}.\n\n` +
      `Vanupriya will personally review your request and confirm your session shortly by email or phone.\n\n` +
      `If this is a mental health emergency, please contact your local emergency services or a crisis helpline ` +
      `immediately rather than waiting for a reply here.\n\n` +
      `Warmly,\nManova Mental Wellness`,
  };
}

function bookingAdminEmail(booking) {
  return {
    subject: `New session request from ${booking.name}`,
    text:
      `New booking request received.\n\n` +
      `Name: ${booking.name}\n` +
      `Email: ${booking.email}\n` +
      `Phone: ${booking.phone || "—"}\n` +
      `Service: ${booking.service}\n` +
      `Preferred date: ${booking.preferredDate || "—"}\n` +
      `Preferred time: ${booking.preferredTime || "—"}\n` +
      `Message: ${booking.message || "—"}\n\n` +
      `Review it in the admin dashboard.`,
  };
}

module.exports = { sendEmail, bookingClientEmail, bookingAdminEmail };
