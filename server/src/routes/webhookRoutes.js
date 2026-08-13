import express from "express";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";
const router = express.Router();
router.post(
  "/razorpay",
  express.raw({
    type: "*/*",
    limit: "1mb",
  }),
  handleRazorpayWebhook,
);
export default router;
