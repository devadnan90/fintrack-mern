import asyncHandler from "express-async-handler";
import Goal from "../models/Goal.js";
import { toCents, fromCents } from "../utils/currency.js";
function serializeGoal(goal) {
  const percent =
    goal.targetAmount > 0
      ? Math.min(
          100,
          Math.round((goal.currentAmount / goal.targetAmount) * 100),
        )
      : 0;
  return {
    id: goal._id,
    name: goal.name,
    targetAmount: fromCents(goal.targetAmount),
    currentAmount: fromCents(goal.currentAmount),
    remaining: fromCents(Math.max(0, goal.targetAmount - goal.currentAmount)),
    percentComplete: percent,
    targetDate: goal.targetDate,
    currency: goal.currency,
    achieved: Boolean(goal.achievedAt),
    achievedAt: goal.achievedAt,
  };
}
export const listGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({
    user: req.user._id,
  }).sort({
    createdAt: -1,
  });
  res.json({
    goals: goals.map(serializeGoal),
  });
});
export const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, targetDate, currency } = req.body;
  if (!name || targetAmount === undefined) {
    res.status(400);
    throw new Error("name and targetAmount are required");
  }
  const goal = await Goal.create({
    user: req.user._id,
    name,
    targetAmount: toCents(targetAmount),
    targetDate: targetDate || null,
    currency: (currency || "USD").toUpperCase(),
  });
  res.status(201).json({
    goal: serializeGoal(goal),
  });
});
export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  const { name, targetAmount, targetDate } = req.body;
  if (name !== undefined) goal.name = name;
  if (targetAmount !== undefined) goal.targetAmount = toCents(targetAmount);
  if (targetDate !== undefined) goal.targetDate = targetDate || null;
  await goal.save();
  res.json({
    goal: serializeGoal(goal),
  });
});
export const addContribution = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (amount === undefined || Number(amount) === 0) {
    res.status(400);
    throw new Error("amount is required and must be non-zero");
  }
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  const wasAchieved = Boolean(goal.achievedAt);
  goal.currentAmount = Math.max(0, goal.currentAmount + toCents(amount));
  const nowAchieved = goal.currentAmount >= goal.targetAmount;
  if (nowAchieved && !wasAchieved) {
    goal.achievedAt = new Date();
  } else if (!nowAchieved && wasAchieved) {
    goal.achievedAt = null;
  }
  await goal.save();
  res.json({
    goal: serializeGoal(goal),
    justAchieved: nowAchieved && !wasAchieved,
  });
});
export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  await goal.deleteOne();
  res.json({
    message: "Goal deleted",
  });
});
