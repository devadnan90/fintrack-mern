import asyncHandler from "express-async-handler";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import Household from "../models/Household.js";
import { computeBudgetProgress } from "../utils/budgetProgress.js";
import { toCents, fromCents } from "../utils/currency.js";
async function serializeBudget(budget, userId) {
  const progress = await computeBudgetProgress(userId, budget);
  return {
    id: budget._id,
    category: budget.category?._id
      ? {
          id: budget.category._id,
          name: budget.category.name,
          icon: budget.category.icon,
          color: budget.category.color,
        }
      : budget.category,
    categoryName: budget.categoryName,
    household: budget.household?._id
      ? {
          id: budget.household._id,
          name: budget.household.name,
        }
      : budget.household,
    amount: fromCents(budget.amount),
    period: budget.period,
    rollover: budget.rollover,
    periodStart: progress.periodStart,
    periodEnd: progress.periodEnd,
    spent: fromCents(progress.spentCents),
    effectiveLimit: fromCents(progress.effectiveLimitCents),
    remaining: fromCents(
      Math.max(0, progress.effectiveLimitCents - progress.spentCents),
    ),
    percentUsed: progress.percentUsed,
    status: progress.status,
  };
}
async function userHouseholdIds(userId) {
  const households = await Household.find({
    $or: [
      {
        owner: userId,
      },
      {
        "members.user": userId,
      },
    ],
  }).select("_id");
  return households.map((h) => h._id);
}
export const listBudgets = asyncHandler(async (req, res) => {
  const householdIds = await userHouseholdIds(req.user._id);
  const budgets = await Budget.find({
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
  })
    .populate("category", "name icon color")
    .populate("household", "name");
  const serialized = await Promise.all(
    budgets.map((b) => serializeBudget(b, req.user._id)),
  );
  res.json({
    budgets: serialized,
  });
});
export const createBudget = asyncHandler(async (req, res) => {
  const { category, categoryName, household, amount, period, rollover } =
    req.body;
  if (amount === undefined || !period) {
    res.status(400);
    throw new Error("amount and period are required");
  }
  if (!["weekly", "monthly"].includes(period)) {
    res.status(400);
    throw new Error("period must be 'weekly' or 'monthly'");
  }
  let budget;
  if (household) {
    if (!categoryName || !categoryName.trim()) {
      res.status(400);
      throw new Error("categoryName is required for a household budget");
    }
    const householdDoc = await Household.findById(household);
    if (!householdDoc || !householdDoc.isMember(req.user._id)) {
      res.status(403);
      throw new Error("You're not a member of that household");
    }
    const escaped = categoryName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await Budget.findOne({
      household,
      categoryName: new RegExp(`^${escaped}$`, "i"),
    });
    if (existing) {
      res.status(409);
      throw new Error(
        "This household already has a budget for that category. Edit it instead.",
      );
    }
    budget = await Budget.create({
      user: req.user._id,
      household,
      categoryName: categoryName.trim(),
      amount: toCents(amount),
      period,
      rollover: Boolean(rollover),
    });
    await budget.populate("household", "name");
  } else {
    if (!category) {
      res.status(400);
      throw new Error("category is required for a personal budget");
    }
    const categoryDoc = await Category.findOne({
      _id: category,
      user: req.user._id,
    });
    if (!categoryDoc) {
      res.status(400);
      throw new Error("category does not exist");
    }
    const existing = await Budget.findOne({
      user: req.user._id,
      category,
      household: null,
    });
    if (existing) {
      res.status(409);
      throw new Error(
        "A budget already exists for this category. Edit it instead.",
      );
    }
    budget = await Budget.create({
      user: req.user._id,
      category,
      amount: toCents(amount),
      period,
      rollover: Boolean(rollover),
    });
    await budget.populate("category", "name icon color");
  }
  res.status(201).json({
    budget: await serializeBudget(budget, req.user._id),
  });
});
async function findEditableBudget(req) {
  const budget = await Budget.findById(req.params.id);
  if (!budget) return null;
  if (budget.household) {
    const householdDoc = await Household.findById(budget.household);
    if (!householdDoc || !householdDoc.isMember(req.user._id)) return null;
  } else if (String(budget.user) !== String(req.user._id)) {
    return null;
  }
  return budget;
}
export const updateBudget = asyncHandler(async (req, res) => {
  const budget = await findEditableBudget(req);
  if (!budget) {
    res.status(404);
    throw new Error("Budget not found");
  }
  const { amount, period, rollover } = req.body;
  if (amount !== undefined) budget.amount = toCents(amount);
  if (period !== undefined) {
    if (!["weekly", "monthly"].includes(period)) {
      res.status(400);
      throw new Error("period must be 'weekly' or 'monthly'");
    }
    budget.period = period;
  }
  if (rollover !== undefined) budget.rollover = Boolean(rollover);
  await budget.save();
  await budget.populate([
    {
      path: "category",
      select: "name icon color",
    },
    {
      path: "household",
      select: "name",
    },
  ]);
  res.json({
    budget: await serializeBudget(budget, req.user._id),
  });
});
export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await findEditableBudget(req);
  if (!budget) {
    res.status(404);
    throw new Error("Budget not found");
  }
  await budget.deleteOne();
  res.json({
    message: "Budget deleted",
  });
});
