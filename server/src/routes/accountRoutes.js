import express from "express";
import {
  listAccounts,
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/accountController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(listAccounts).post(createAccount);
router.route("/:id").get(getAccount).put(updateAccount).delete(deleteAccount);
export default router;
