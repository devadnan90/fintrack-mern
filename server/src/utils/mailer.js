import nodemailer from "nodemailer";
let transporter = null;
let attemptedInit = false;
function getTransporter() {
  if (attemptedInit) return transporter;
  attemptedInit = true;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
  return transporter;
}
export async function sendMail({ to, subject, text, html, attachments }) {
  const client = getTransporter();
  if (!client) {
    console.log(
      `\n[mailer] SMTP not configured — logging email instead of sending.\n` +
        `  To: ${to}\n  Subject: ${subject}${attachments?.length ? `\n  Attachments: ${attachments.map((a) => a.filename).join(", ")}` : ""}\n\n${text}\n`,
    );
    return {
      delivered: false,
      reason: "smtp-not-configured",
    };
  }
  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || "FinTrack <no-reply@fintrack.app>",
      to,
      subject,
      text,
      html,
      attachments,
    });
    return {
      delivered: true,
    };
  } catch (err) {
    console.error(`[mailer] Failed to send email to ${to}:`, err.message);
    return {
      delivered: false,
      reason: err.message,
    };
  }
}
