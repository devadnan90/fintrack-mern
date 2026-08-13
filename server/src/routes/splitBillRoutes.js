import express from "express";
import {
  listSplitBills,
  createSplitBill,
  updateSplitBill,
  settleParticipant,
  downloadPaymentRequest,
  deleteSplitBill,
} from "../controllers/splitBillController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePremium } from "../middleware/premiumMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/", listSplitBills);
router.post("/", createSplitBill);
router.put("/:id", updateSplitBill);
router.post("/:id/participants/:participantId/settle", settleParticipant);
router.get(
  "/:id/participants/:participantId/receipt.pdf",
  requirePremium,
  downloadPaymentRequest,
);
router.delete("/:id", deleteSplitBill);
export default router;
