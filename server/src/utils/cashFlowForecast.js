import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import Bill from "../models/Bill.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { attachBalances } from "./computeBalances.js";
import { getRates, convertCents } from "./exchangeRates.js";
import { nextOccurrence } from "./recurrence.js";
import { fromCents } from "./currency.js";
const HISTORY_DAYS = 90;
const MAX_PROJECTED_OCCURRENCES = 60;
async function currentTotalBalanceCents(user) {
  const baseCurrency = user.baseCurrency || "USD";
  const accounts = await Account.find({
    user: user._id,
    isArchived: false,
  });
  const withBalances = await attachBalances(user._id, accounts);
  let total = 0;
  const byCurrency = new Map();
  for (const acc of withBalances) {
    byCurrency.set(
      acc.currency,
      (byCurrency.get(acc.currency) || 0) + acc.balance,
    );
  }
  for (const [currency, subtotal] of byCurrency.entries()) {
    if (currency === baseCurrency) {
      total += subtotal;
      continue;
    }
    try {
      const rates = await getRates(currency);
      const converted = convertCents(subtotal, currency, baseCurrency, rates);
      if (converted !== null) total += converted;
    } catch {}
  }
  return {
    total,
    baseCurrency,
  };
}
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}
async function scheduledEvents(userId, end) {
  const events = [];
  const bills = await Bill.find({
    user: userId,
    paidAt: null,
  });
  for (const bill of bills) {
    let due = new Date(bill.dueDate);
    let iterations = 0;
    while (due <= end && iterations < MAX_PROJECTED_OCCURRENCES) {
      events.push({
        date: new Date(due),
        amountCents: -bill.amount,
      });
      const next = nextOccurrence(due, bill.recurrence);
      if (!next) break;
      due = next;
      iterations += 1;
    }
  }
  const templates = await RecurringTransaction.find({
    user: userId,
    isActive: true,
  });
  for (const t of templates) {
    if (t.type === "transfer") continue;
    let due = new Date(t.nextDueDate);
    let iterations = 0;
    while (
      due <= end &&
      (!t.endDate || due <= t.endDate) &&
      iterations < MAX_PROJECTED_OCCURRENCES
    ) {
      events.push({
        date: new Date(due),
        amountCents: t.type === "income" ? t.amount : -t.amount,
      });
      const next = nextOccurrence(due, t.recurrence);
      if (!next) break;
      due = next;
      iterations += 1;
    }
  }
  return events;
}
async function discretionaryDailyRateCents(userId) {
  const start = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: {
          $in: ["income", "expense"],
        },
        date: {
          $gte: start,
        },
        generatedFrom: null,
        generatedFromBill: null,
      },
    },
    {
      $group: {
        _id: "$type",
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);
  const income = rows.find((r) => r._id === "income")?.total || 0;
  const expense = rows.find((r) => r._id === "expense")?.total || 0;
  return (income - expense) / HISTORY_DAYS;
}
export async function computeCashFlowForecast(user, days = 90) {
  const { total: startingBalanceCents, baseCurrency } =
    await currentTotalBalanceCents(user);
  const now = new Date();
  const end = new Date(now.getTime() + days * 86_400_000);
  const [events, dailyRate] = await Promise.all([
    scheduledEvents(user._id, end),
    discretionaryDailyRateCents(user._id),
  ]);
  const eventsByDay = new Map();
  for (const e of events) {
    const key = dayKey(e.date);
    eventsByDay.set(key, (eventsByDay.get(key) || 0) + e.amountCents);
  }
  const stepDays = days > 120 ? 7 : 1;
  const series = [];
  let runningBalance = startingBalanceCents;
  let lowBalanceDate = null;
  for (let elapsed = 0; elapsed <= days; elapsed += stepDays) {
    const date = new Date(now.getTime() + elapsed * 86_400_000);
    if (elapsed === 0) {
      runningBalance = startingBalanceCents;
    } else {
      const stepStart = new Date(
        now.getTime() + (elapsed - stepDays) * 86_400_000,
      );
      for (let d = 1; d <= stepDays; d += 1) {
        const day = new Date(stepStart.getTime() + d * 86_400_000);
        runningBalance += eventsByDay.get(dayKey(day)) || 0;
        runningBalance += dailyRate;
      }
    }
    if (runningBalance < 0 && !lowBalanceDate) {
      lowBalanceDate = new Date(date);
    }
    series.push({
      date,
      projectedBalance: fromCents(Math.round(runningBalance)),
    });
  }
  return {
    baseCurrency,
    startingBalance: fromCents(startingBalanceCents),
    dailyDiscretionaryRate: fromCents(dailyRate),
    days,
    series,
    lowBalanceDate,
  };
}
