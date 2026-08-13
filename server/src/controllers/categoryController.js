import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
export const FREE_CUSTOM_CATEGORY_LIMIT = 5;
function serializeCategory(cat) {
  return {
    id: cat._id,
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
    color: cat.color,
    parentCategory: cat.parentCategory || null,
    isDefault: cat.isDefault,
  };
}
export const listCategories = asyncHandler(async (req, res) => {
  const filter = {
    user: req.user._id,
  };
  if (req.query.type) filter.type = req.query.type;
  const categories = await Category.find(filter).sort({
    type: 1,
    name: 1,
  });
  const isPremium = req.user.hasActivePremium();
  const customCount = categories.filter((c) => !c.isDefault).length;
  res.json({
    categories: categories.map(serializeCategory),
    customCategoryLimit: isPremium ? null : FREE_CUSTOM_CATEGORY_LIMIT,
    customCategoryCount: customCount,
  });
});
export const createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color, parentCategory } = req.body;
  if (!name || !type) {
    res.status(400);
    throw new Error("Name and type are required");
  }
  if (!["income", "expense"].includes(type)) {
    res.status(400);
    throw new Error("Type must be 'income' or 'expense'");
  }
  if (parentCategory) {
    const parent = await Category.findOne({
      _id: parentCategory,
      user: req.user._id,
    });
    if (!parent) {
      res.status(400);
      throw new Error("parentCategory does not exist");
    }
  }
  if (!req.user.hasActivePremium()) {
    const customCount = await Category.countDocuments({
      user: req.user._id,
      isDefault: false,
    });
    if (customCount >= FREE_CUSTOM_CATEGORY_LIMIT) {
      res.status(402);
      throw new Error(
        `Free plan is limited to ${FREE_CUSTOM_CATEGORY_LIMIT} custom categories. Upgrade to Premium for unlimited categories.`,
      );
    }
  }
  const category = await Category.create({
    user: req.user._id,
    name,
    type,
    icon: icon || "tag",
    color: color || "#64748b",
    parentCategory: parentCategory || null,
  });
  res.status(201).json({
    category: serializeCategory(category),
  });
});
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  const { name, icon, color, parentCategory } = req.body;
  if (name !== undefined) category.name = name;
  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;
  if (parentCategory !== undefined)
    category.parentCategory = parentCategory || null;
  await category.save();
  res.json({
    category: serializeCategory(category),
  });
});
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  const inUseCount = await Transaction.countDocuments(
    {
      user: req.user._id,
      category: category._id,
    },
    {
      includeDeleted: true,
    },
  );
  if (inUseCount > 0) {
    const { reassignTo } = req.query;
    if (!reassignTo) {
      res.status(409);
      throw new Error(
        `${inUseCount} transaction(s) use this category. Pass ?reassignTo=<categoryId> to reassign them before deleting.`,
      );
    }
    if (reassignTo === String(category._id)) {
      res.status(400);
      throw new Error("reassignTo must be a different category");
    }
    const replacement = await Category.findOne({
      _id: reassignTo,
      user: req.user._id,
    });
    if (!replacement) {
      res.status(400);
      throw new Error("reassignTo category does not exist");
    }
    await Transaction.updateMany(
      {
        user: req.user._id,
        category: category._id,
      },
      {
        $set: {
          category: replacement._id,
        },
      },
    );
  }
  await category.deleteOne();
  res.json({
    message: "Category deleted",
  });
});
