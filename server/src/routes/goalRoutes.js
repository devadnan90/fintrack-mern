import express from "express";
import {
  listGoals,
  createGoal,
  updateGoal,
  addContribution,
  deleteGoal,
} from "../controllers/goalController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(listGoals).post(createGoal);
router.route("/:id").put(updateGoal).delete(deleteGoal);
router.post("/:id/contributions", addContribution);
export default router;
