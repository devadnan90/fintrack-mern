import ErrorLog from "../models/ErrorLog.js";
import { getClientIp } from "../utils/requestMeta.js";
export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}
function persistServerError(err, req, statusCode) {
  if (statusCode === 404 || statusCode === 401) return;
  ErrorLog.create({
    source: "server",
    message: err.message || "Server error",
    stack: err.stack || null,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    user: req.user?._id || null,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
  }).catch((logErr) => {
    console.error("[errorLog] failed to persist server error:", logErr.message);
  });
}
export function errorHandler(err, req, res, next) {
  const statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    persistServerError(err, req, 400);
    return res.status(400).json({
      message: messages.join(", "),
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    persistServerError(err, req, 409);
    return res.status(409).json({
      message: `${field} is already in use`,
    });
  }
  persistServerError(err, req, statusCode);
  res.status(statusCode).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}
