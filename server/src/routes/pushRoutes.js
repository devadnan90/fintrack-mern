import express from "express";
import {
  vapidPublicKey,
  subscribe,
  unsubscribe,
  pushStatus,
} from "../controllers/pushController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/vapid-public-key", vapidPublicKey);
router.get("/status", pushStatus);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
export default router;
