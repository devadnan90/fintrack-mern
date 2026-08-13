import express from "express";
import {
  listBills,
  createBill,
  updateBill,
  markBillPaid,
  deleteBill,
} from "../controllers/billController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(listBills).post(createBill);
router.route("/:id").put(updateBill).delete(deleteBill);
router.post("/:id/pay", markBillPaid);
export default router;
