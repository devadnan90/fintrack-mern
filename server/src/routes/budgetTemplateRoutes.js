import express from "express";
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
  applyTemplate,
} from "../controllers/budgetTemplateController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePremium } from "../middleware/premiumMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/", listTemplates);
router.post("/", requirePremium, createTemplate);
router.delete("/:id", deleteTemplate);
router.post("/:id/apply", applyTemplate);
export default router;
