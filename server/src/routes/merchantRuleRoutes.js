import express from "express";
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  applyRule,
} from "../controllers/merchantRuleController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/", listRules);
router.post("/", createRule);
router.put("/:id", updateRule);
router.delete("/:id", deleteRule);
router.post("/:id/apply", applyRule);
export default router;
