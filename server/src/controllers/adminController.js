import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import os from "os";
import User from "../models/User.js";
import PremiumOrder from "../models/PremiumOrder.js";
import LoginActivity from "../models/LoginActivity.js";
import ErrorLog from "../models/ErrorLog.js";
import WebhookEvent from "../models/WebhookEvent.js";
import connectDB from "../config/db.js";
import {
  isAdminConfigured,
  verifyAdminCredentials,
  signAdminToken,
} from "../utils/adminAuth.js";
export const adminLogin = asyncHandler(async (req, res) => {
  if (!isAdminConfigured()) {
    res.status(503);
    throw new Error(
      "Admin panel isn't configured on this server yet (missing ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_JWT_SECRET).",
    );
  }
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }
  if (!verifyAdminCredentials(email, password)) {
    res.status(401);
    throw new Error("Invalid admin credentials");
  }
  res.json({
    token: signAdminToken(),
  });
});
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({
    createdAt: -1,
  });
  const orders = await PremiumOrder.find({
    status: "verified",
  });
  const spendByUser = new Map();
  for (const order of orders) {
    const key = order.user.toString();
    const entry = spendByUser.get(key) || {
      totalPaise: 0,
      orderCount: 0,
    };
    entry.totalPaise += order.amount;
    entry.orderCount += 1;
    spendByUser.set(key, entry);
  }
  res.json({
    users: users.map((u) => {
      const spend = spendByUser.get(u._id.toString()) || {
        totalPaise: 0,
        orderCount: 0,
      };
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        banned: u.banned,
        createdAt: u.createdAt,
        baseCurrency: u.baseCurrency,
        premium: {
          plan: u.premium?.plan || null,
          expiresAt: u.premium?.expiresAt || null,
          isActive: u.hasActivePremium(),
        },
        lifetimeSpend: {
          totalPaise: spend.totalPaise,
          orderCount: spend.orderCount,
        },
      };
    }),
  });
});
export const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const orders = await PremiumOrder.find({
    user: user._id,
  }).sort({
    createdAt: -1,
  });
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      banned: user.banned,
      createdAt: user.createdAt,
      baseCurrency: user.baseCurrency,
      twoFactorEnabled: Boolean(user.twoFactor?.enabled),
      premium: {
        plan: user.premium?.plan || null,
        activatedAt: user.premium?.activatedAt || null,
        expiresAt: user.premium?.expiresAt || null,
        isActive: user.hasActivePremium(),
      },
    },
    purchases: orders.map((o) => ({
      id: o._id,
      orderId: o.orderId,
      paymentId: o.paymentId,
      plan: o.plan,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt,
    })),
  });
});
export const banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.banned = true;
  await user.save();
  res.json({
    message: `${user.email} has been banned`,
    banned: true,
  });
});
export const unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.banned = false;
  await user.save();
  res.json({
    message: `${user.email} has been unbanned`,
    banned: false,
  });
});
const MONGOOSE_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};
export const getHealth = asyncHandler(async (req, res) => {
  const readyState = mongoose.connection.readyState;
  let pingMs = null;
  let pingError = null;
  if (readyState === 1) {
    const start = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      pingMs = Date.now() - start;
    } catch (err) {
      pingError = err.message;
    }
  }
  res.json({
    server: {
      status: "up",
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",
      platform: os.platform(),
      loadAverage: os.loadavg(),
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        totalMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMb: Math.round(os.freemem() / 1024 / 1024),
      },
    },
    database: {
      state: MONGOOSE_STATE_LABELS[readyState] || "unknown",
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      pingMs,
      pingError,
    },
  });
});
export const reconnectDatabase = asyncHandler(async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch {}
  try {
    await connectDB();
    res.json({
      reconnected: true,
      state: MONGOOSE_STATE_LABELS[mongoose.connection.readyState],
    });
  } catch (err) {
    res.status(503);
    throw new Error(`Reconnect failed: ${err.message}`);
  }
});
export const listLoginActivity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.success === "true") filter.success = true;
  if (req.query.success === "false") filter.success = false;
  const entries = await LoginActivity.find(filter)
    .sort({
      createdAt: -1,
    })
    .limit(200)
    .populate("user", "name email");
  res.json({
    entries: entries.map((e) => ({
      id: e._id,
      user: e.user
        ? {
            id: e.user._id,
            name: e.user.name,
            email: e.user.email,
          }
        : null,
      email: e.email,
      success: e.success,
      method: e.method,
      reason: e.reason,
      ip: e.ip,
      browser: e.browser,
      os: e.os,
      deviceType: e.deviceType,
      country: e.country,
      region: e.region,
      city: e.city,
      createdAt: e.createdAt,
    })),
  });
});
export const listErrorLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.source === "server" || req.query.source === "client")
    filter.source = req.query.source;
  const errors = await ErrorLog.find(filter)
    .sort({
      createdAt: -1,
    })
    .limit(200)
    .populate("user", "name email");
  res.json({
    errors: errors.map((e) => ({
      id: e._id,
      source: e.source,
      message: e.message,
      stack: e.stack,
      method: e.method,
      path: e.path,
      statusCode: e.statusCode,
      user: e.user
        ? {
            id: e.user._id,
            name: e.user.name,
            email: e.user.email,
          }
        : null,
      ip: e.ip,
      userAgent: e.userAgent,
      createdAt: e.createdAt,
    })),
  });
});
export const listWebhookEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.eventType) filter.eventType = req.query.eventType;
  const events = await WebhookEvent.find(filter)
    .sort({
      createdAt: -1,
    })
    .limit(200);
  res.json({
    events: events.map((e) => ({
      id: e._id,
      source: e.source,
      eventType: e.eventType,
      signatureValid: e.signatureValid,
      payload: e.payload,
      createdAt: e.createdAt,
    })),
  });
});
