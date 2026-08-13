import express from "express";
import { getSummary, askQuestion } from "../controllers/insightsController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/summary", getSummary);
router.post("/ask", askQuestion);
export default router;
