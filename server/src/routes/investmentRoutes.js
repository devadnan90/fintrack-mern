import express from "express";
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "../controllers/investmentController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(listInvestments).post(createInvestment);
router.route("/:id").put(updateInvestment).delete(deleteInvestment);
export default router;
