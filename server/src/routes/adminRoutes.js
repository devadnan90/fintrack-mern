import express from "express";
import {
  adminLogin,
  listUsers,
  getUserDetail,
  banUser,
  unbanUser,
  getHealth,
  reconnectDatabase,
  listLoginActivity,
  listErrorLogs,
  listWebhookEvents,
} from "../controllers/adminController.js";
import {
  getRazorpayConfig,
  testRazorpayConnection,
  listOrders,
  fetchOrder,
  fetchOrderPayments,
  fetchPayment,
  capturePayment,
  refundPayment,
  listRefunds,
  getRevenueSummary,
} from "../controllers/adminRazorpayController.js";
import { protectAdmin } from "../middleware/adminMiddleware.js";
const router = express.Router();
router.post("/login", adminLogin);
router.use(protectAdmin);
router.get("/users", listUsers);
router.get("/users/:id", getUserDetail);
router.post("/users/:id/ban", banUser);
router.post("/users/:id/unban", unbanUser);
router.get("/health", getHealth);
router.post("/health/reconnect", reconnectDatabase);
router.get("/login-activity", listLoginActivity);
router.get("/errors", listErrorLogs);
router.get("/webhooks", listWebhookEvents);
router.get("/razorpay/config", getRazorpayConfig);
router.post("/razorpay/test-connection", testRazorpayConnection);
router.get("/razorpay/orders", listOrders);
router.get("/razorpay/orders/:orderId", fetchOrder);
router.get("/razorpay/orders/:orderId/payments", fetchOrderPayments);
router.get("/razorpay/payments/:paymentId", fetchPayment);
router.post("/razorpay/payments/:paymentId/capture", capturePayment);
router.post("/razorpay/payments/:paymentId/refund", refundPayment);
router.get("/razorpay/payments/:paymentId/refunds", listRefunds);
router.get("/razorpay/revenue-summary", getRevenueSummary);
export default router;
