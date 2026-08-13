import asyncHandler from "express-async-handler";
import MerchantRule, { MATCH_TYPE_VALUES } from "../models/MerchantRule.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import { matchRule } from "../utils/merchantRules.js";
function serializeRule(rule) {
  return {
    id: rule._id,
    pattern: rule.pattern,
    matchType: rule.matchType,
    category:
      rule.category && rule.category._id
        ? {
            id: rule.category._id,
            name: rule.category.name,
            icon: rule.category.icon,
            color: rule.category.color,
          }
        : rule.category,
    createdAt: rule.createdAt,
  };
}
export const listRules = asyncHandler(async (req, res) => {
  const rules = await MerchantRule.find({
    user: req.user._id,
  })
    .sort({
      createdAt: -1,
    })
    .populate("category", "name icon color");
  res.json({
    rules: rules.map(serializeRule),
  });
});
export const createRule = asyncHandler(async (req, res) => {
  const { pattern, matchType, category } = req.body;
  if (!pattern || !pattern.trim() || !category) {
    res.status(400);
    throw new Error("pattern and category are required");
  }
  if (matchType && !MATCH_TYPE_VALUES.includes(matchType)) {
    res.status(400);
    throw new Error(
      `matchType must be one of: ${MATCH_TYPE_VALUES.join(", ")}`,
    );
  }
  const categoryDoc = await Category.findOne({
    _id: category,
    user: req.user._id,
  });
  if (!categoryDoc) {
    res.status(400);
    throw new Error("category does not exist");
  }
  let rule;
  try {
    rule = await MerchantRule.create({
      user: req.user._id,
      pattern,
      matchType: matchType || "contains",
      category,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("You already have a rule for this pattern");
    }
    throw err;
  }
  await rule.populate("category", "name icon color");
  res.status(201).json({
    rule: serializeRule(rule),
  });
});
export const updateRule = asyncHandler(async (req, res) => {
  const rule = await MerchantRule.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!rule) {
    res.status(404);
    throw new Error("Rule not found");
  }
  const { pattern, matchType, category } = req.body;
  if (pattern !== undefined) {
    if (!pattern.trim()) {
      res.status(400);
      throw new Error("pattern cannot be empty");
    }
    rule.pattern = pattern;
  }
  if (matchType !== undefined) {
    if (!MATCH_TYPE_VALUES.includes(matchType)) {
      res.status(400);
      throw new Error(
        `matchType must be one of: ${MATCH_TYPE_VALUES.join(", ")}`,
      );
    }
    rule.matchType = matchType;
  }
  if (category !== undefined) {
    const categoryDoc = await Category.findOne({
      _id: category,
      user: req.user._id,
    });
    if (!categoryDoc) {
      res.status(400);
      throw new Error("category does not exist");
    }
    rule.category = category;
  }
  try {
    await rule.save();
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("You already have a rule for this pattern");
    }
    throw err;
  }
  await rule.populate("category", "name icon color");
  res.json({
    rule: serializeRule(rule),
  });
});
export const deleteRule = asyncHandler(async (req, res) => {
  const rule = await MerchantRule.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!rule) {
    res.status(404);
    throw new Error("Rule not found");
  }
  await rule.deleteOne();
  res.json({
    message: "Rule deleted",
  });
});
export const applyRule = asyncHandler(async (req, res) => {
  const rule = await MerchantRule.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!rule) {
    res.status(404);
    throw new Error("Rule not found");
  }
  const candidates = await Transaction.find({
    user: req.user._id,
    type: {
      $ne: "transfer",
    },
    category: null,
    splits: {
      $size: 0,
    },
  });
  let updated = 0;
  for (const t of candidates) {
    const match = matchRule([rule], t.description);
    if (match) {
      t.category = rule.category;
      await t.save();
      updated += 1;
    }
  }
  res.json({
    updated,
  });
});
