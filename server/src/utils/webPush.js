import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";
let configured = false;
let attemptedInit = false;
function ensureConfigured() {
  if (attemptedInit) return configured;
  attemptedInit = true;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
    return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:no-reply@fintrack.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}
export function getVapidPublicKey() {
  return ensureConfigured() ? process.env.VAPID_PUBLIC_KEY : null;
}
export async function sendPushToUser(userId, { title, body, url }) {
  if (!ensureConfigured()) return;
  const subscriptions = await PushSubscription.find({
    user: userId,
  });
  if (subscriptions.length === 0) return;
  const payload = JSON.stringify({
    title: title || "FinTrack",
    body,
    url: url || "/dashboard",
  });
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({
            _id: sub._id,
          });
        } else {
          console.error(
            `[webPush] Failed to send to subscription ${sub._id}:`,
            err.message,
          );
        }
      }
    }),
  );
}
