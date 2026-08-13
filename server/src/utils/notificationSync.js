import Bill from "../models/Bill.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Household from "../models/Household.js";
import { computeBudgetProgress } from "./budgetProgress.js";
import { fromCents } from "./currency.js";
import { sendMail } from "./mailer.js";
import { sendPushToUser } from "./webPush.js";
import {
  detectCategoryAnomalies,
  detectLargeTransactions,
} from "./anomalyDetection.js";
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}
const EMAIL_PREFERENCE_KEY = {
  "bill-overdue": "billReminders",
  "bill-upcoming": "billReminders",
  "budget-approaching": "budgetAlerts",
  "budget-exceeded": "budgetAlerts",
  "goal-achieved": "goalMilestones",
  "spending-anomaly": "anomalyAlerts",
  "large-transaction": "anomalyAlerts",
};
async function upsertNotification(user, { dedupeKey, type, message, link }) {
  const existing = await Notification.findOne({
    user: user._id,
    dedupeKey,
  }).select("_id");
  if (existing) return;
  let wasInserted = true;
  try {
    await Notification.create({
      user: user._id,
      dedupeKey,
      type,
      message,
      link,
      read: false,
    });
  } catch (err) {
    if (err.code === 11000) {
      wasInserted = false;
    } else {
      throw err;
    }
  }
  if (!wasInserted) return;
  const prefKey = EMAIL_PREFERENCE_KEY[type];
  if (prefKey && user.emailNotifications?.[prefKey] !== false) {
    const url = `${process.env.CLIENT_URL || "http://localhost:5173"}${link}`;
    await sendMail({
      to: user.email,
      subject: `FinTrack: ${message}`,
      text: `${message}\n\nView it here: ${url}`,
      html: `<p>${message}</p><p><a href="${url}">View in FinTrack</a></p>`,
    });
  }
  await sendPushToUser(user._id, {
    title: "FinTrack",
    body: message,
    url: link,
  });
}
export async function generateNotifications(userId) {
  const memberHouseholds = await Household.find({
    $or: [
      {
        owner: userId,
      },
      {
        "members.user": userId,
      },
    ],
  }).select("_id");
  const householdIds = memberHouseholds.map((h) => h._id);
  const [user, bills, budgets, goals] = await Promise.all([
    User.findById(userId),
    Bill.find({
      user: userId,
    }).populate("account", "name"),
    Budget.find({
      $or: [
        {
          user: userId,
          household: null,
        },
        {
          household: {
            $in: householdIds,
          },
        },
      ],
    })
      .populate("category", "name")
      .populate("household", "name"),
    Goal.find({
      user: userId,
    }),
  ]);
  if (!user) return;
  const now = new Date();
  for (const bill of bills) {
    if (bill.paidAt) continue;
    if (bill.dueDate < now) {
      await upsertNotification(user, {
        dedupeKey: `bill:${bill._id}:overdue:${dayKey(bill.dueDate)}`,
        type: "bill-overdue",
        message: `${bill.name} (${fromCents(bill.amount).toFixed(2)}) is overdue`,
        link: "/bills",
      });
    } else {
      const daysUntil = Math.ceil((bill.dueDate - now) / 86_400_000);
      if (daysUntil <= (bill.reminderDaysBefore ?? 3)) {
        await upsertNotification(user, {
          dedupeKey: `bill:${bill._id}:upcoming:${dayKey(bill.dueDate)}`,
          type: "bill-upcoming",
          message: `${bill.name} (${fromCents(bill.amount).toFixed(2)}) is due ${daysUntil <= 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}`,
          link: "/bills",
        });
      }
    }
  }
  for (const budget of budgets) {
    const progress = await computeBudgetProgress(userId, budget);
    if (progress.status === "on-track") continue;
    const periodKey = progress.periodStart.toISOString().slice(0, 10);
    const label = budget.category?.name || budget.categoryName || "Budget";
    const householdPrefix = budget.household
      ? `${budget.household.name}: `
      : "";
    await upsertNotification(user, {
      dedupeKey: `budget:${budget._id}:${progress.status}:${periodKey}`,
      type:
        progress.status === "exceeded"
          ? "budget-exceeded"
          : "budget-approaching",
      message:
        progress.status === "exceeded"
          ? `${householdPrefix}${label} budget exceeded (${progress.percentUsed}% used)`
          : `${householdPrefix}${label} budget is nearing its limit (${progress.percentUsed}% used)`,
      link: "/budgets",
    });
  }
  for (const goal of goals) {
    if (!goal.achievedAt) continue;
    await upsertNotification(user, {
      dedupeKey: `goal:${goal._id}:achieved:${new Date(goal.achievedAt).toISOString()}`,
      type: "goal-achieved",
      message: `You hit your "${goal.name}" goal! 🎉`,
      link: "/goals",
    });
  }
  const categoryAnomalies = await detectCategoryAnomalies(userId);
  if (categoryAnomalies.length > 0) {
    const categoryIds = categoryAnomalies.map((a) => a.categoryId);
    const categoryDocs = await Category.find({
      _id: {
        $in: categoryIds,
      },
    });
    const categoryNameById = new Map(
      categoryDocs.map((c) => [String(c._id), c.name]),
    );
    for (const anomaly of categoryAnomalies) {
      const name = categoryNameById.get(anomaly.categoryId) || "A category";
      const pctAboveAvg = Math.round(
        (anomaly.current / anomaly.average - 1) * 100,
      );
      await upsertNotification(user, {
        dedupeKey: `anomaly:category:${anomaly.categoryId}:${anomaly.month}`,
        type: "spending-anomaly",
        message: `${name} spending this month (${fromCents(anomaly.current).toFixed(2)}) is ${pctAboveAvg}% above your recent average`,
        link: "/reports",
      });
    }
  }
  const sinceDate = new Date(now.getTime() - 14 * 86_400_000);
  const largeTransactions = await detectLargeTransactions(userId, sinceDate);
  for (const { transaction, average } of largeTransactions) {
    await upsertNotification(user, {
      dedupeKey: `anomaly:txn:${transaction._id}`,
      type: "large-transaction",
      message: `${transaction.description || transaction.category.name} (${fromCents(transaction.amount).toFixed(2)}) is much larger than your usual ${transaction.category.name} transaction (avg ${fromCents(average).toFixed(2)})`,
      link: "/transactions",
    });
  }
}
