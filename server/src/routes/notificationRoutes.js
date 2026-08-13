import express from "express";
import {
  listNotifications,
  markRead,
  markAllRead,
  dismissNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/", listNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);
router.delete("/:id", dismissNotification);
export default router;
