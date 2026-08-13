import asyncHandler from "express-async-handler";
import BudgetTemplate from "../models/BudgetTemplate.js";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import { toCents, fromCents } from "../utils/currency.js";
function serializeTemplate(t) {
  return {
    id: t._id,
    name: t.name,
    items: t.items.map((i) => ({
      categoryName: i.categoryName,
      amount: fromCents(i.amount),
      period: i.period,
      rollover: i.rollover,
    })),
  };
}
export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await BudgetTemplate.find({
    user: req.user._id,
  }).sort({
    createdAt: -1,
  });
  res.json({
    templates: templates.map(serializeTemplate),
  });
});
export const createTemplate = asyncHandler(async (req, res) => {
  const { name, items } = req.body;
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("name is required");
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("At least one budget item is required");
  }
  for (const i of items) {
    if (
      !i.categoryName ||
      !i.amount ||
      !["weekly", "monthly"].includes(i.period)
    ) {
      res.status(400);
      throw new Error(
        "Each item needs categoryName, amount, and a valid period",
      );
    }
  }
  const cleanItems = items.map((i) => ({
    categoryName: String(i.categoryName).trim(),
    amount: toCents(Number(i.amount)),
    period: i.period,
    rollover: Boolean(i.rollover),
  }));
  const template = await BudgetTemplate.create({
    user: req.user._id,
    name: name.trim(),
    items: cleanItems,
  });
  res.status(201).json({
    template: serializeTemplate(template),
  });
});
export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await BudgetTemplate.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!template) {
    res.status(404);
    throw new Error("Template not found");
  }
  await template.deleteOne();
  res.json({
    message: "Template deleted",
  });
});
export const applyTemplate = asyncHandler(async (req, res) => {
  const template = await BudgetTemplate.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!template) {
    res.status(404);
    throw new Error("Template not found");
  }
  const categories = await Category.find({
    user: req.user._id,
  });
  const categoryByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c]),
  );
  const existingBudgets = await Budget.find({
    user: req.user._id,
    household: null,
  });
  const budgetedCategoryIds = new Set(
    existingBudgets.map((b) => String(b.category)),
  );
  const created = [];
  const skipped = [];
  for (const item of template.items) {
    const category = categoryByName.get(item.categoryName.trim().toLowerCase());
    if (!category) {
      skipped.push({
        categoryName: item.categoryName,
        reason: "No matching category found",
      });
      continue;
    }
    if (budgetedCategoryIds.has(String(category._id))) {
      skipped.push({
        categoryName: item.categoryName,
        reason: "A budget already exists for this category",
      });
      continue;
    }
    const budget = await Budget.create({
      user: req.user._id,
      category: category._id,
      amount: item.amount,
      period: item.period,
      rollover: item.rollover,
    });
    budgetedCategoryIds.add(String(category._id));
    created.push({
      categoryName: category.name,
      amount: fromCents(budget.amount),
      period: budget.period,
    });
  }
  res.json({
    created,
    skipped,
  });
});
