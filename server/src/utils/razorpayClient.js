import Razorpay from "razorpay";
let client = null;
let attemptedInit = false;
export function isRazorpayConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
}
export function getRazorpayClient() {
  if (attemptedInit) return client;
  attemptedInit = true;
  if (!isRazorpayConfigured()) return null;
  client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return client;
}
