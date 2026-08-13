import asyncHandler from "express-async-handler";
import Notification from "../models/Notification.js";
import { generateNotifications } from "../utils/notificationSync.js";
function serializeNotification(n) {
  return {
    id: n._id,
    type: n.type,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt,
  };
}
export const listNotifications = asyncHandler(async (req, res) => {
  await generateNotifications(req.user._id);
  const notifications = await Notification.find({
    user: req.user._id,
  })
    .sort({
      createdAt: -1,
    })
    .limit(50);
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });
  res.json({
    notifications: notifications.map(serializeNotification),
    unreadCount,
  });
});
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
    },
    {
      read: true,
    },
    {
      new: true,
    },
  );
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({
    notification: serializeNotification(notification),
  });
});
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user._id,
      read: false,
    },
    {
      read: true,
    },
  );
  res.json({
    message: "All notifications marked as read",
  });
});
export const dismissNotification = asyncHandler(async (req, res) => {
  const result = await Notification.deleteOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({
    message: "Notification dismissed",
  });
});
