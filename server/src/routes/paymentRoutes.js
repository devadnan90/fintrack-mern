import express from "express";
import {
  getConfig,
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/config", getConfig);
router.post("/order", createOrder);
router.post("/verify", verifyPayment);
export default router;
