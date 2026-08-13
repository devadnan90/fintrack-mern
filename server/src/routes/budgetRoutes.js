import express from "express";
import {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../controllers/budgetController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(listBudgets).post(createBudget);
router.route("/:id").put(updateBudget).delete(deleteBudget);
export default router;
