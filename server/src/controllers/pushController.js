import asyncHandler from "express-async-handler";
import PushSubscription from "../models/PushSubscription.js";
import { getVapidPublicKey } from "../utils/webPush.js";
export const vapidPublicKey = asyncHandler(async (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503);
    throw new Error("Push notifications aren't configured on this server");
  }
  res.json({
    publicKey: key,
  });
});
export const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400);
    throw new Error("A valid push subscription is required");
  }
  await PushSubscription.findOneAndUpdate(
    {
      endpoint,
    },
    {
      user: req.user._id,
      endpoint,
      keys,
      userAgent: req.headers["user-agent"] || "",
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
  res.status(201).json({
    message: "Subscribed to push notifications",
  });
});
export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await PushSubscription.deleteOne({
      endpoint,
      user: req.user._id,
    });
  } else {
    await PushSubscription.deleteMany({
      user: req.user._id,
    });
  }
  res.json({
    message: "Unsubscribed from push notifications",
  });
});
export const pushStatus = asyncHandler(async (req, res) => {
  const count = await PushSubscription.countDocuments({
    user: req.user._id,
  });
  res.json({
    subscribed: count > 0,
    configured: Boolean(getVapidPublicKey()),
  });
});
