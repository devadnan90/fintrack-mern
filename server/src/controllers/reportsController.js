import asyncHandler from "express-async-handler";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Household from "../models/Household.js";
import { attachBalances } from "../utils/computeBalances.js";
import { getRates, convertCents } from "../utils/exchangeRates.js";
import { fromCents } from "../utils/currency.js";
import { generateReportPdf } from "../utils/pdfReport.js";
import { buildFinTrackWorkbook } from "../utils/xlsxExport.js";
import { computeBudgetProgress } from "../utils/budgetProgress.js";
import { computeCashFlowForecast } from "../utils/cashFlowForecast.js";
import { sendScheduledReport } from "../utils/scheduledReports.js";
import { getCalendarMonth } from "../utils/financialCalendar.js";
import User from "../models/User.js";
export function resolveRange(query, { defaultDays = 30 } = {}) {
  const now = new Date();
  const start = query.dateFrom
    ? new Date(query.dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = query.dateTo
    ? new Date(query.dateTo)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      start: new Date(now.getTime() - defaultDays * 86400000),
      end: new Date(now.getTime() + 86400000),
    };
  }
  return {
    start,
    end,
  };
}
export async function computeNetWorth(user) {
  const baseCurrency = user.baseCurrency || "USD";
  const accounts = await Account.find({
    user: user._id,
    isArchived: false,
  });
  const withBalances = await attachBalances(user._id, accounts);
  const byCurrency = new Map();
  for (const acc of withBalances) {
    const list = byCurrency.get(acc.currency) || [];
    list.push(acc);
    byCurrency.set(acc.currency, list);
  }
  let totalCents = 0;
  const breakdown = [];
  const conversionErrors = [];
  for (const [currency, accs] of byCurrency.entries()) {
    const subtotalCents = accs.reduce((sum, a) => sum + a.balance, 0);
    if (currency === baseCurrency) {
      totalCents += subtotalCents;
      breakdown.push({
        currency,
        subtotal: fromCents(subtotalCents),
        converted: fromCents(subtotalCents),
        rate: 1,
      });
      continue;
    }
    try {
      const rates = await getRates(currency);
      const convertedCents = convertCents(
        subtotalCents,
        currency,
        baseCurrency,
        rates,
      );
      if (convertedCents === null)
        throw new Error(`No rate for ${baseCurrency}`);
      totalCents += convertedCents;
      breakdown.push({
        currency,
        subtotal: fromCents(subtotalCents),
        converted: fromCents(convertedCents),
        rate: rates[baseCurrency],
      });
    } catch (err) {
      conversionErrors.push({
        currency,
        message: err.message,
      });
    }
  }
  return {
    baseCurrency,
    netWorth: fromCents(totalCents),
    breakdown,
    conversionErrors,
  };
}
export async function computeSpendingByCategory(userId, start, end) {
  const [directRows, splitRows] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          date: {
            $gte: start,
            $lt: end,
          },
          $or: [
            {
              splits: {
                $exists: false,
              },
            },
            {
              splits: {
                $size: 0,
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$category",
          total: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          date: {
            $gte: start,
            $lt: end,
          },
          "splits.0": {
            $exists: true,
          },
        },
      },
      {
        $unwind: "$splits",
      },
      {
        $group: {
          _id: "$splits.category",
          total: {
            $sum: "$splits.amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);
  const merged = new Map();
  for (const r of [...directRows, ...splitRows]) {
    const key = String(r._id);
    const existing = merged.get(key) || {
      _id: r._id,
      total: 0,
      count: 0,
    };
    existing.total += r.total;
    existing.count += r.count;
    merged.set(key, existing);
  }
  const categoryIds = Array.from(merged.values())
    .map((r) => r._id)
    .filter(Boolean);
  const categoryDocs = await Category.find({
    _id: {
      $in: categoryIds,
    },
  }).select("name color");
  const categoryById = new Map(categoryDocs.map((c) => [String(c._id), c]));
  return Array.from(merged.values())
    .map((r) => {
      const cat = r._id ? categoryById.get(String(r._id)) : null;
      return {
        category: cat?.name || "Uncategorized",
        color: cat?.color || "#94a3b8",
        total: fromCents(r.total),
        count: r.count,
      };
    })
    .sort((a, b) => b.total - a.total);
}
export const getNetWorth = asyncHandler(async (req, res) => {
  res.json(await computeNetWorth(req.user));
});
export const getNetWorthHistory = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
  const baseCurrency = req.user.baseCurrency || "USD";
  const now = new Date();
  const accounts = await Account.find({
    user: req.user._id,
    isArchived: false,
  });
  if (accounts.length === 0) {
    res.json({
      baseCurrency,
      data: [],
    });
    return;
  }
  const accountIds = new Set(accounts.map((a) => String(a._id)));
  const runningBalance = new Map(
    accounts.map((a) => [String(a._id), a.openingBalance]),
  );
  const currencyById = new Map(
    accounts.map((a) => [String(a._id), a.currency]),
  );
  const transactions = await Transaction.find({
    user: req.user._id,
  })
    .sort({
      date: 1,
    })
    .select("account toAccount type amount date");
  const events = [];
  for (const t of transactions) {
    const accountKey = String(t.account);
    if (t.type === "income" && accountIds.has(accountKey)) {
      events.push({
        date: t.date,
        account: accountKey,
        delta: t.amount,
      });
    } else if (t.type === "expense" && accountIds.has(accountKey)) {
      events.push({
        date: t.date,
        account: accountKey,
        delta: -t.amount,
      });
    } else if (t.type === "transfer") {
      if (accountIds.has(accountKey))
        events.push({
          date: t.date,
          account: accountKey,
          delta: -t.amount,
        });
      const toKey = t.toAccount ? String(t.toAccount) : null;
      if (toKey && accountIds.has(toKey))
        events.push({
          date: t.date,
          account: toKey,
          delta: t.amount,
        });
    }
  }
  events.sort((a, b) => a.date - b.date);
  const sampleDates = [];
  for (let i = 0; i < months; i += 1) {
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1) + i,
      1,
    );
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    sampleDates.push({
      period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
      date: monthEnd > now ? now : monthEnd,
    });
  }
  const rateTables = new Map();
  for (const currency of new Set(currencyById.values())) {
    if (currency === baseCurrency) continue;
    try {
      rateTables.set(currency, await getRates(currency));
    } catch {
      rateTables.set(currency, null);
    }
  }
  let eventIndex = 0;
  const data = [];
  for (const sample of sampleDates) {
    while (
      eventIndex < events.length &&
      events[eventIndex].date <= sample.date
    ) {
      const e = events[eventIndex];
      runningBalance.set(
        e.account,
        (runningBalance.get(e.account) || 0) + e.delta,
      );
      eventIndex += 1;
    }
    let totalCents = 0;
    for (const [accountId, balanceCents] of runningBalance.entries()) {
      const currency = currencyById.get(accountId);
      if (currency === baseCurrency) {
        totalCents += balanceCents;
      } else {
        const rates = rateTables.get(currency);
        const converted = rates
          ? convertCents(balanceCents, currency, baseCurrency, rates)
          : null;
        if (converted !== null) totalCents += converted;
      }
    }
    data.push({
      period: sample.period,
      netWorth: fromCents(totalCents),
    });
  }
  res.json({
    baseCurrency,
    data,
  });
});
export const getSpendingByCategory = asyncHandler(async (req, res) => {
  const { start, end } = resolveRange(req.query);
  const data = await computeSpendingByCategory(req.user._id, start, end);
  res.json({
    from: start,
    to: end,
    data,
  });
});
export const getTrend = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type: {
          $in: ["income", "expense"],
        },
        date: {
          $gte: start,
        },
      },
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$date",
          },
          month: {
            $month: "$date",
          },
          type: "$type",
        },
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);
  const buckets = new Map();
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      period: key,
      income: 0,
      expense: 0,
    });
  }
  for (const r of rows) {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket[r._id.type] = fromCents(r.total);
  }
  res.json({
    data: Array.from(buckets.values()),
  });
});
function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
export const exportTransactionsCsv = asyncHandler(async (req, res) => {
  const { start, end } = resolveRange(req.query, {
    defaultDays: 3650,
  });
  const transactions = await Transaction.find({
    user: req.user._id,
    date: {
      $gte: start,
      $lt: end,
    },
  })
    .sort({
      date: 1,
    })
    .populate("account", "name")
    .populate("category", "name");
  const header = "date,description,amount,type,category,account";
  const rows = transactions.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      csvEscape(t.description),
      fromCents(t.amount),
      t.type,
      csvEscape(t.category?.name || ""),
      csvEscape(t.account?.name || ""),
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fintrack-transactions.csv",
  );
  res.send(csv);
});
export const exportReportPdf = asyncHandler(async (req, res) => {
  const { start, end } = resolveRange(req.query, {
    defaultDays: 30,
  });
  const [netWorth, spendingByCategory, transactions] = await Promise.all([
    computeNetWorth(req.user),
    computeSpendingByCategory(req.user._id, start, end),
    Transaction.find({
      user: req.user._id,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .sort({
        date: 1,
      })
      .populate("account", "name")
      .populate("category", "name"),
  ]);
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      if (t.type === "expense") acc.expense += t.amount;
      return acc;
    },
    {
      income: 0,
      expense: 0,
    },
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fintrack-report.pdf",
  );
  generateReportPdf(res, {
    user: req.user,
    range: {
      start,
      end,
    },
    netWorth,
    spendingByCategory,
    income: fromCents(totals.income),
    expense: fromCents(totals.expense),
    transactions: transactions.map((t) => ({
      date: t.date,
      description: t.description,
      type: t.type,
      amount: fromCents(t.amount),
      category: t.category?.name || "",
      account: t.account?.name || "",
    })),
  });
});
export const exportReportXlsx = asyncHandler(async (req, res) => {
  const { start, end } = resolveRange(req.query, {
    defaultDays: 3650,
  });
  const householdIds = (
    await Household.find({
      $or: [
        {
          owner: req.user._id,
        },
        {
          "members.user": req.user._id,
        },
      ],
    }).select("_id")
  ).map((h) => h._id);
  const [transactions, netWorth, budgetDocs] = await Promise.all([
    Transaction.find({
      user: req.user._id,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .sort({
        date: 1,
      })
      .populate("account", "name")
      .populate("category", "name"),
    computeNetWorth(req.user),
    Budget.find({
      $or: [
        {
          user: req.user._id,
          household: null,
        },
        {
          household: {
            $in: householdIds,
          },
        },
      ],
    }).populate("category", "name"),
  ]);
  const budgets = await Promise.all(
    budgetDocs.map(async (b) => {
      const progress = await computeBudgetProgress(req.user._id, b);
      return {
        categoryLabel: b.category?.name || b.categoryName || "Uncategorized",
        period: b.period,
        effectiveLimit: fromCents(progress.effectiveLimitCents),
        spent: fromCents(progress.spentCents),
        remaining: fromCents(
          Math.max(0, progress.effectiveLimitCents - progress.spentCents),
        ),
        percentUsed: progress.percentUsed,
        status: progress.status,
      };
    }),
  );
  const workbook = buildFinTrackWorkbook({
    transactions,
    budgets,
    netWorth,
  });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fintrack-export.xlsx",
  );
  await workbook.xlsx.write(res);
  res.end();
});
export const getCashFlowForecast = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 90));
  const forecast = await computeCashFlowForecast(req.user, days);
  res.json(forecast);
});
export const sendReportNow = asyncHandler(async (req, res) => {
  const { frequency } = req.body;
  if (!["weekly", "monthly"].includes(frequency)) {
    res.status(400);
    throw new Error("frequency must be 'weekly' or 'monthly'");
  }
  const user = await User.findById(req.user._id);
  await sendScheduledReport(user, frequency);
  res.json({
    message: "Report sent",
  });
});
export const getCalendar = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  if (month < 1 || month > 12) {
    res.status(400);
    throw new Error("month must be between 1 and 12");
  }
  const calendar = await getCalendarMonth(req.user._id, year, month);
  res.json(calendar);
});
