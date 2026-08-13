import crypto from "crypto";
import asyncHandler from "express-async-handler";
import WebhookEvent from "../models/WebhookEvent.js";
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body || {}));
  const signatureValid = verifyWebhookSignature(rawBody, signature, secret);
  let payload = {};
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    payload = {};
  }
  await WebhookEvent.create({
    source: "razorpay",
    eventType: payload.event || "unknown",
    payload,
    signatureValid,
  });
  res.status(200).json({
    received: true,
    verified: signatureValid,
  });
});
