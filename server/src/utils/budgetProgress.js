import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Household from "../models/Household.js";
import { currentPeriodRange, previousPeriodRange } from "./periods.js";
export async function spentInRange(userId, categoryId, start, end) {
  const [direct, split] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          user: userId,
          category: categoryId,
          type: "expense",
          date: {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
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
          "splits.category": categoryId,
        },
      },
      {
        $unwind: "$splits",
      },
      {
        $match: {
          "splits.category": categoryId,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$splits.amount",
          },
        },
      },
    ]),
  ]);
  return (direct[0]?.total || 0) + (split[0]?.total || 0);
}
async function householdSpentInRange(memberIds, categoryName, start, end) {
  const escaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRegex = new RegExp(`^${escaped}$`, "i");
  const matches = await Category.find({
    user: {
      $in: memberIds,
    },
    name: nameRegex,
  });
  const totals = await Promise.all(
    matches.map((cat) => spentInRange(cat.user, cat._id, start, end)),
  );
  return totals.reduce((sum, t) => sum + t, 0);
}
async function computePersonalBudgetProgress(userId, budget) {
  const categoryId = budget.category._id || budget.category;
  const { start, end } = currentPeriodRange(budget.period);
  const spentCents = await spentInRange(userId, categoryId, start, end);
  let effectiveLimitCents = budget.amount;
  if (budget.rollover) {
    const prevRange = previousPeriodRange(budget.period);
    const prevSpentCents = await spentInRange(
      userId,
      categoryId,
      prevRange.start,
      prevRange.end,
    );
    const unused = Math.max(0, budget.amount - prevSpentCents);
    effectiveLimitCents += unused;
  }
  return finalize(start, end, spentCents, effectiveLimitCents);
}
async function computeHouseholdBudgetProgress(budget) {
  const household = budget.household._id
    ? budget.household
    : await Household.findById(budget.household);
  const memberIds = household ? household.memberIds() : [];
  const { start, end } = currentPeriodRange(budget.period);
  const spentCents = memberIds.length
    ? await householdSpentInRange(memberIds, budget.categoryName, start, end)
    : 0;
  let effectiveLimitCents = budget.amount;
  if (budget.rollover && memberIds.length) {
    const prevRange = previousPeriodRange(budget.period);
    const prevSpentCents = await householdSpentInRange(
      memberIds,
      budget.categoryName,
      prevRange.start,
      prevRange.end,
    );
    const unused = Math.max(0, budget.amount - prevSpentCents);
    effectiveLimitCents += unused;
  }
  return finalize(start, end, spentCents, effectiveLimitCents);
}
function finalize(start, end, spentCents, effectiveLimitCents) {
  const percentUsed =
    effectiveLimitCents > 0
      ? Math.round((spentCents / effectiveLimitCents) * 100)
      : 0;
  const status =
    percentUsed >= 100
      ? "exceeded"
      : percentUsed >= 80
        ? "approaching"
        : "on-track";
  return {
    periodStart: start,
    periodEnd: end,
    spentCents,
    effectiveLimitCents,
    percentUsed,
    status,
  };
}
export async function computeBudgetProgress(userId, budget) {
  if (budget.household) return computeHouseholdBudgetProgress(budget);
  return computePersonalBudgetProgress(userId, budget);
}
