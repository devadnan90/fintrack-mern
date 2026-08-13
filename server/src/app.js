import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import recurringTransactionRoutes from "./routes/recurringTransactionRoutes.js";
import debtRoutes from "./routes/debtRoutes.js";
import merchantRuleRoutes from "./routes/merchantRuleRoutes.js";
import householdRoutes from "./routes/householdRoutes.js";
import splitBillRoutes from "./routes/splitBillRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import budgetTemplateRoutes from "./routes/budgetTemplateRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientErrorRoutes from "./routes/clientErrorRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/api/webhooks", webhookRoutes);
app.use(
  express.json({
    limit: "5mb",
  }),
);
app.use(cookieParser());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recurring-transactions", recurringTransactionRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/merchant-rules", merchantRuleRoutes);
app.use("/api/households", householdRoutes);
app.use("/api/split-bills", splitBillRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/budget-templates", budgetTemplateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client-errors", clientErrorRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
