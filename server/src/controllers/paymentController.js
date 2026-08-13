import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import PremiumOrder from "../models/PremiumOrder.js";
import {
  isRazorpayConfigured,
  getRazorpayClient,
} from "../utils/razorpayClient.js";
import {
  getPremiumPlans,
  getPremiumPlanById,
  computeNewExpiry,
} from "../utils/premiumPlans.js";
import { verifyRazorpaySignature } from "../utils/paymentVerification.js";
export const getConfig = asyncHandler(async (req, res) => {
  const enabled = isRazorpayConfigured();
  res.json({
    enabled,
    keyId: enabled ? process.env.RAZORPAY_KEY_ID : null,
    plans: getPremiumPlans(),
    premium: {
      isActive: req.user.hasActivePremium(),
      plan: req.user.premium?.plan || null,
      expiresAt: req.user.premium?.expiresAt || null,
    },
  });
});
function assertConfiguredOr503(res) {
  if (!isRazorpayConfigured()) {
    res.status(503);
    throw new Error(
      "Premium upgrade is not configured on this server (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)",
    );
  }
}
export const createOrder = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const plan = getPremiumPlanById(req.body.plan);
  if (!plan) {
    res.status(400);
    throw new Error(
      `plan must be one of: ${getPremiumPlans()
        .map((p) => p.id)
        .join(", ")}`,
    );
  }
  const razorpay = getRazorpayClient();
  const receipt = `prem_${req.user._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`;
  let order;
  try {
    order = await razorpay.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt,
      notes: {
        userId: String(req.user._id),
        plan: plan.id,
      },
    });
  } catch (err) {
    const description =
      err?.error?.description ||
      err?.message ||
      "Failed to create Razorpay order";
    res.status(err?.statusCode && err.statusCode < 500 ? err.statusCode : 502);
    throw new Error(description);
  }
  await PremiumOrder.create({
    user: req.user._id,
    orderId: order.id,
    plan: plan.id,
    amount: order.amount,
    currency: order.currency,
  });
  res.status(201).json({
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    },
    plan,
  });
});
export const verifyPayment = asyncHandler(async (req, res) => {
  assertConfiguredOr503(res);
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;
  if (!orderId || !paymentId || !signature) {
    res.status(400);
    throw new Error(
      "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
    );
  }
  const ok = verifyRazorpaySignature(
    {
      orderId,
      paymentId,
      signature,
    },
    process.env.RAZORPAY_KEY_SECRET,
  );
  if (!ok) {
    res.status(400);
    throw new Error("Payment verification failed");
  }
  const pendingOrder = await PremiumOrder.findOne({
    orderId,
    user: req.user._id,
    status: "created",
  });
  if (!pendingOrder) {
    res.status(404);
    throw new Error("Order not found or already processed");
  }
  const plan = getPremiumPlanById(pendingOrder.plan);
  const user = await User.findById(req.user._id);
  const expiresAt = computeNewExpiry(user.premium?.expiresAt, plan.days);
  user.premium = {
    plan: plan.id,
    orderId,
    paymentId,
    activatedAt: new Date(),
    expiresAt,
  };
  await user.save();
  pendingOrder.status = "verified";
  pendingOrder.paymentId = paymentId;
  await pendingOrder.save();
  res.json({
    user: user.toSafeObject(),
  });
});
