import asyncHandler from "express-async-handler";
import ErrorLog from "../models/ErrorLog.js";
import { getClientIp } from "../utils/requestMeta.js";
const MAX_FIELD_LENGTH = 5000;
function truncate(value) {
  if (!value) return null;
  return String(value).slice(0, MAX_FIELD_LENGTH);
}
export const reportClientError = asyncHandler(async (req, res) => {
  const { message, stack, path } = req.body;
  if (!message) {
    res.status(400);
    throw new Error("message is required");
  }
  await ErrorLog.create({
    source: "client",
    message: truncate(message),
    stack: truncate(stack),
    path: truncate(path) || req.headers.referer || null,
    user: req.user?._id || null,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
  });
  res.status(201).json({
    received: true,
  });
});
