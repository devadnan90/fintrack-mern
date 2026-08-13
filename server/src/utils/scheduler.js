import cron from "node-cron";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import SplitBill from "../models/SplitBill.js";
import { sendScheduledReport } from "./scheduledReports.js";
import {
  FREE_TRASH_RETENTION_DAYS,
  PREMIUM_TRASH_RETENTION_DAYS,
} from "../controllers/transactionController.js";
const REPORT_HOUR_UTC = 13;
const PURGE_HOUR_UTC = 4;
function isSameUtcDay(a, b) {
  if (!a || !b) return false;
  return (
    new Date(a).toISOString().slice(0, 10) ===
    new Date(b).toISOString().slice(0, 10)
  );
}
export function isReportDue(prefs, now = new Date()) {
  if (isSameUtcDay(prefs.lastSentAt, now)) return false;
  if (prefs.frequency === "weekly") {
    return now.getUTCDay() === prefs.dayOfWeek;
  }
  const lastDayOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return now.getUTCDate() === Math.min(prefs.dayOfMonth, lastDayOfMonth);
}
export async function runScheduledReports(now = new Date()) {
  if (now.getUTCHours() !== REPORT_HOUR_UTC)
    return {
      checked: 0,
      sent: 0,
    };
  const users = await User.find({
    "scheduledReports.enabled": true,
  });
  let sent = 0;
  for (const user of users) {
    if (!isReportDue(user.scheduledReports, now)) continue;
    try {
      await sendScheduledReport(user, user.scheduledReports.frequency);
      sent += 1;
    } catch (err) {
      console.error(
        `[scheduler] Failed to send ${user.scheduledReports.frequency} report to ${user.email}:`,
        err.message,
      );
    }
  }
  return {
    checked: users.length,
    sent,
  };
}
export async function purgeDeletedTransactions(now = new Date()) {
  if (now.getUTCHours() !== PURGE_HOUR_UTC)
    return {
      purged: 0,
    };
  const freeCutoff = new Date(
    now.getTime() - FREE_TRASH_RETENTION_DAYS * 86_400_000,
  );
  const premiumCutoff = new Date(
    now.getTime() - PREMIUM_TRASH_RETENTION_DAYS * 86_400_000,
  );
  const activePremiumUserIds = await User.find({
    "premium.expiresAt": {
      $gt: now,
    },
  }).distinct("_id");
  const [staleFree, stalePremium] = await Promise.all([
    Transaction.find({
      deletedAt: {
        $ne: null,
        $lte: freeCutoff,
      },
      user: {
        $nin: activePremiumUserIds,
      },
    }).select("_id"),
    Transaction.find({
      deletedAt: {
        $ne: null,
        $lte: premiumCutoff,
      },
      user: {
        $in: activePremiumUserIds,
      },
    }).select("_id"),
  ]);
  const stale = [...staleFree, ...stalePremium];
  if (stale.length === 0)
    return {
      purged: 0,
    };
  const ids = stale.map((t) => t._id);
  await SplitBill.deleteMany({
    transaction: {
      $in: ids,
    },
  });
  const result = await Transaction.deleteMany({
    _id: {
      $in: ids,
    },
  });
  return {
    purged: result.deletedCount,
  };
}
export function startScheduler() {
  if (process.env.NODE_ENV === "test") return;
  cron.schedule("0 * * * *", () => {
    runScheduledReports().catch((err) =>
      console.error("[scheduler] run failed:", err.message),
    );
    purgeDeletedTransactions().catch((err) =>
      console.error("[scheduler] purge failed:", err.message),
    );
  });
}
