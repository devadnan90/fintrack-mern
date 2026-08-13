import Transaction from "../models/Transaction.js";
import Bill from "../models/Bill.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { nextOccurrence } from "./recurrence.js";
import { fromCents } from "./currency.js";
const MAX_OCCURRENCES_PER_MONTH = 10;
const MAX_FAST_FORWARD_STEPS = 2000;
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}
function getOrCreateDay(days, date) {
  const key = dayKey(date);
  if (!days.has(key)) {
    days.set(key, {
      date: key,
      transactions: [],
      bills: [],
      recurring: [],
      income: 0,
      expense: 0,
    });
  }
  return days.get(key);
}
export function projectOccurrencesInMonth(
  startDate,
  recurrence,
  monthStart,
  monthEnd,
  maxIterations = MAX_OCCURRENCES_PER_MONTH,
) {
  let due = new Date(startDate);
  let fastForwardSteps = 0;
  while (due < monthStart && fastForwardSteps < MAX_FAST_FORWARD_STEPS) {
    const next = nextOccurrence(due, recurrence);
    if (!next) return [];
    due = next;
    fastForwardSteps += 1;
  }
  const dates = [];
  let iterations = 0;
  while (due < monthEnd && iterations < maxIterations) {
    if (due >= monthStart) dates.push(new Date(due));
    const next = nextOccurrence(due, recurrence);
    if (!next) break;
    due = next;
    iterations += 1;
  }
  return dates;
}
export async function getCalendarMonth(userId, year, month) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const now = new Date();
  const [transactions, bills, templates] = await Promise.all([
    Transaction.find({
      user: userId,
      date: {
        $gte: monthStart,
        $lt: monthEnd,
      },
    })
      .populate("category", "name color")
      .populate("account", "name"),
    Bill.find({
      user: userId,
    }),
    RecurringTransaction.find({
      user: userId,
      isActive: true,
    }),
  ]);
  const days = new Map();
  for (const t of transactions) {
    const day = getOrCreateDay(days, t.date);
    day.transactions.push({
      id: t._id,
      type: t.type,
      amount: fromCents(t.amount),
      description: t.description,
      category: t.category?.name || null,
      categoryColor: t.category?.color || null,
      account: t.account?.name || null,
    });
    if (t.type === "income") day.income += t.amount;
    if (t.type === "expense") day.expense += t.amount;
  }
  for (const bill of bills) {
    if (bill.paidAt) continue;
    for (const due of projectOccurrencesInMonth(
      bill.dueDate,
      bill.recurrence,
      monthStart,
      monthEnd,
    )) {
      const day = getOrCreateDay(days, due);
      day.bills.push({
        id: bill._id,
        name: bill.name,
        amount: fromCents(bill.amount),
        status: due < now ? "overdue" : "upcoming",
      });
    }
  }
  for (const t of templates) {
    const cutoff =
      t.endDate && t.endDate < monthEnd
        ? new Date(t.endDate.getTime() + 1)
        : monthEnd;
    for (const due of projectOccurrencesInMonth(
      t.nextDueDate,
      t.recurrence,
      monthStart,
      cutoff,
    )) {
      const day = getOrCreateDay(days, due);
      day.recurring.push({
        id: t._id,
        description:
          t.description || (t.type === "transfer" ? "Transfer" : t.type),
        type: t.type,
        amount: fromCents(t.amount),
      });
    }
  }
  const serializedDays = Array.from(days.values())
    .map((d) => ({
      ...d,
      income: fromCents(d.income),
      expense: fromCents(d.expense),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    year,
    month,
    days: serializedDays,
  };
}
