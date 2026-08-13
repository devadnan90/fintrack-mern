import express from "express";
import {
  listDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  getPayoffPlan,
} from "../controllers/debtController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/plan", getPayoffPlan);
router.route("/").get(listDebts).post(createDebt);
router.route("/:id").put(updateDebt).delete(deleteDebt);
export default router;
