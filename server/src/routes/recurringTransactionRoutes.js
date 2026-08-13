import express from "express";
import {
  listRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "../controllers/recurringTransactionController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router
  .route("/")
  .get(listRecurringTransactions)
  .post(createRecurringTransaction);
router
  .route("/:id")
  .put(updateRecurringTransaction)
  .delete(deleteRecurringTransaction);
export default router;
