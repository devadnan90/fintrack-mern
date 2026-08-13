import Transaction from "../models/Transaction.js";
const CATEGORY_ANOMALY_MULTIPLIER = 1.5;
const CATEGORY_ANOMALY_MIN_CENTS = 2000;
const CATEGORY_HISTORY_MONTHS = 3;
const CATEGORY_MIN_HISTORY_MONTHS = 2;
const TRANSACTION_ANOMALY_MULTIPLIER = 3;
const TRANSACTION_ANOMALY_MIN_SAMPLE = 5;
const TRANSACTION_ANOMALY_MIN_CENTS = 5000;
function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
export async function detectCategoryAnomalies(userId) {
  const now = new Date();
  const thisMonthStart = monthStart(now);
  const historyStart = new Date(thisMonthStart);
  historyStart.setMonth(historyStart.getMonth() - CATEGORY_HISTORY_MONTHS);
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        category: {
          $ne: null,
        },
        date: {
          $gte: historyStart,
        },
      },
    },
    {
      $group: {
        _id: {
          category: "$category",
          month: {
            $dateToString: {
              format: "%Y-%m",
              date: "$date",
            },
          },
        },
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);
  const thisMonthKey = thisMonthStart.toISOString().slice(0, 7);
  const byCategory = new Map();
  for (const row of rows) {
    const catId = String(row._id.category);
    if (!byCategory.has(catId))
      byCategory.set(catId, {
        current: 0,
        history: [],
      });
    const entry = byCategory.get(catId);
    if (row._id.month === thisMonthKey) entry.current = row.total;
    else entry.history.push(row.total);
  }
  const anomalies = [];
  for (const [categoryId, { current, history }] of byCategory.entries()) {
    if (
      history.length < CATEGORY_MIN_HISTORY_MONTHS ||
      current < CATEGORY_ANOMALY_MIN_CENTS
    )
      continue;
    const average = history.reduce((sum, v) => sum + v, 0) / history.length;
    if (average <= 0) continue;
    if (current >= average * CATEGORY_ANOMALY_MULTIPLIER) {
      anomalies.push({
        categoryId,
        current,
        average,
        month: thisMonthKey,
      });
    }
  }
  return anomalies;
}
export async function detectLargeTransactions(userId, sinceDate) {
  const recent = await Transaction.find({
    user: userId,
    type: "expense",
    category: {
      $ne: null,
    },
    date: {
      $gte: sinceDate,
    },
  }).populate("category", "name");
  if (recent.length === 0) return [];
  const results = [];
  for (const t of recent) {
    if (t.amount < TRANSACTION_ANOMALY_MIN_CENTS) continue;
    const [stats] = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          category: t.category._id,
          _id: {
            $ne: t._id,
          },
        },
      },
      {
        $group: {
          _id: null,
          avg: {
            $avg: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);
    if (!stats || stats.count < TRANSACTION_ANOMALY_MIN_SAMPLE) continue;
    if (t.amount >= stats.avg * TRANSACTION_ANOMALY_MULTIPLIER) {
      results.push({
        transaction: t,
        average: stats.avg,
      });
    }
  }
  return results;
}
