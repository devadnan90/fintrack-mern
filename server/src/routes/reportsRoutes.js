import express from "express";
import {
  getNetWorth,
  getNetWorthHistory,
  getSpendingByCategory,
  getTrend,
  exportTransactionsCsv,
  exportReportPdf,
  exportReportXlsx,
  getCashFlowForecast,
  sendReportNow,
  getCalendar,
} from "../controllers/reportsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePremium } from "../middleware/premiumMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/net-worth", getNetWorth);
router.get("/net-worth-history", getNetWorthHistory);
router.get("/spending-by-category", getSpendingByCategory);
router.get("/trend", getTrend);
router.get("/export.csv", exportTransactionsCsv);
router.get("/export.pdf", exportReportPdf);
router.get("/export.xlsx", requirePremium, exportReportXlsx);
router.get("/cash-flow-forecast", requirePremium, getCashFlowForecast);
router.post("/send-now", sendReportNow);
router.get("/calendar", requirePremium, getCalendar);
export default router;
