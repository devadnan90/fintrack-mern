import asyncHandler from "express-async-handler";
import PremiumOrder from "../models/PremiumOrder.js";
import {
  isRazorpayConfigured,
  getRazorpayClient,
} from "../utils/razorpayClient.js";
import { getPremiumPlans } from "../utils/premiumPlans.js";
function assertConfiguredOr503(res) {
  if (!isRazorpayConfigured()) {
    res.status(503);
    throw new Error(
      "Razorpay is not configured on this server (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)",
    );
  }
}
function rethrowRazorpayError(res, err, fallbackMessage) {
  const description =
    err?.error?.description || err?.message || fallbackMessage;
  res.status(err?.statusCode && err.statusCode < 500 ? err.statusCode : 502);
  throw new Error(description);
}
export const getRazorpayConfig = asyncHandler(async (req, res) => {
  const enabled = isRazorpayConfigured();
  res.json({
    enabled,
    keyId: enabled ? process.env.RAZORPAY_KEY_ID : null,
    currency: process.env.RAZORPAY_CURRENCY || "INR",
    plans: getPremiumPlans(),
  });
});
export const testRazorpayConnection = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const razorpay = getRazorpayClient();
  try {
    await razorpay.orders.all({
      count: 1,
    });
    res.json({
      ok: true,
      message: "Razorpay API key pair is valid and reachable",
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Razorpay connection test failed");
  }
});
export const listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const orders = await PremiumOrder.find(filter)
    .sort({
      createdAt: -1,
    })
    .limit(200)
    .populate("user", "name email");
  res.json({
    orders: orders.map((o) => ({
      id: o._id,
      orderId: o.orderId,
      paymentId: o.paymentId,
      plan: o.plan,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt,
      user: o.user
        ? {
            id: o.user._id,
            name: o.user.name,
            email: o.user.email,
          }
        : null,
    })),
  });
});
export const fetchOrder = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const razorpay = getRazorpayClient();
  try {
    const order = await razorpay.orders.fetch(req.params.orderId);
    res.json({
      order,
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to fetch order");
  }
});
export const fetchOrderPayments = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const razorpay = getRazorpayClient();
  try {
    const payments = await razorpay.orders.fetchPayments(req.params.orderId);
    res.json({
      payments: payments.items || [],
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to fetch payments for order");
  }
});
export const fetchPayment = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const razorpay = getRazorpayClient();
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json({
      payment,
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to fetch payment");
  }
});
export const capturePayment = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const { amount, currency } = req.body;
  if (!amount) {
    res.status(400);
    throw new Error("amount (in paise) is required");
  }
  const razorpay = getRazorpayClient();
  try {
    const payment = await razorpay.payments.capture(
      req.params.paymentId,
      amount,
      currency || "INR",
    );
    res.json({
      payment,
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to capture payment");
  }
});
export const refundPayment = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const { amount, notes } = req.body;
  const razorpay = getRazorpayClient();
  try {
    const refund = await razorpay.payments.refund(req.params.paymentId, {
      ...(amount
        ? {
            amount,
          }
        : {}),
      ...(notes
        ? {
            notes: {
              reason: String(notes),
            },
          }
        : {}),
    });
    res.json({
      refund,
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to refund payment");
  }
});
export const listRefunds = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const razorpay = getRazorpayClient();
  try {
    const refunds = await razorpay.payments.fetchMultipleRefund(
      req.params.paymentId,
    );
    res.json({
      refunds: refunds.items || [],
    });
  } catch (err) {
    rethrowRazorpayError(res, err, "Failed to list refunds");
  }
});
export const getRevenueSummary = asyncHandler(async (req, res) => {
  const verifiedOrders = await PremiumOrder.find({
    status: "verified",
  });
  const byPlan = new Map();
  let totalPaise = 0;
  for (const order of verifiedOrders) {
    const entry = byPlan.get(order.plan) || {
      plan: order.plan,
      orderCount: 0,
      totalPaise: 0,
    };
    entry.orderCount += 1;
    entry.totalPaise += order.amount;
    byPlan.set(order.plan, entry);
    totalPaise += order.amount;
  }
  res.json({
    currency: process.env.RAZORPAY_CURRENCY || "INR",
    totalPaise,
    totalOrders: verifiedOrders.length,
    byPlan: Array.from(byPlan.values()),
  });
});
