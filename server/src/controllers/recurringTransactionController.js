import asyncHandler from "express-async-handler";
import RecurringTransaction, {
  RECURRING_TXN_RECURRENCE_VALUES,
} from "../models/RecurringTransaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import { toCents, fromCents } from "../utils/currency.js";
import { generateDueRecurringTransactions } from "../utils/recurringTransactions.js";
function serialize(t) {
  return {
    id: t._id,
    account: t.account?._id
      ? {
          id: t.account._id,
          name: t.account.name,
        }
      : t.account,
    toAccount: t.toAccount?._id
      ? {
          id: t.toAccount._id,
          name: t.toAccount.name,
        }
      : t.toAccount,
    category: t.category?._id
      ? {
          id: t.category._id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        }
      : t.category,
    type: t.type,
    amount: fromCents(t.amount),
    description: t.description,
    tags: t.tags,
    recurrence: t.recurrence,
    nextDueDate: t.nextDueDate,
    endDate: t.endDate,
    isActive: t.isActive,
    lastGeneratedAt: t.lastGeneratedAt,
  };
}
async function assertOwned(userId, { account, toAccount, category }) {
  const accountDoc = await Account.findOne({
    _id: account,
    user: userId,
  });
  if (!accountDoc) {
    const err = new Error("account not found or does not belong to you");
    err.status = 400;
    throw err;
  }
  if (toAccount) {
    const toAccountDoc = await Account.findOne({
      _id: toAccount,
      user: userId,
    });
    if (!toAccountDoc) {
      const err = new Error("toAccount not found or does not belong to you");
      err.status = 400;
      throw err;
    }
  }
  if (category) {
    const categoryDoc = await Category.findOne({
      _id: category,
      user: userId,
    });
    if (!categoryDoc) {
      const err = new Error("category not found or does not belong to you");
      err.status = 400;
      throw err;
    }
  }
}
function populateOpts() {
  return [
    {
      path: "account",
      select: "name",
    },
    {
      path: "toAccount",
      select: "name",
    },
    {
      path: "category",
      select: "name icon color",
    },
  ];
}
export const listRecurringTransactions = asyncHandler(async (req, res) => {
  await generateDueRecurringTransactions(req.user._id);
  const items = await RecurringTransaction.find({
    user: req.user._id,
  })
    .sort({
      nextDueDate: 1,
    })
    .populate(populateOpts());
  res.json({
    recurringTransactions: items.map(serialize),
  });
});
export const createRecurringTransaction = asyncHandler(async (req, res) => {
  const {
    account,
    toAccount,
    category,
    type,
    amount,
    description,
    tags,
    recurrence,
    startDate,
    endDate,
  } = req.body;
  if (!account || !type || amount === undefined || !recurrence || !startDate) {
    res.status(400);
    throw new Error(
      "account, type, amount, recurrence, and startDate are required",
    );
  }
  if (!["income", "expense", "transfer"].includes(type)) {
    res.status(400);
    throw new Error("type must be 'income', 'expense', or 'transfer'");
  }
  if (!RECURRING_TXN_RECURRENCE_VALUES.includes(recurrence)) {
    res.status(400);
    throw new Error(
      `recurrence must be one of: ${RECURRING_TXN_RECURRENCE_VALUES.join(", ")}`,
    );
  }
  const cents = toCents(amount);
  if (cents <= 0) {
    res.status(400);
    throw new Error("amount must be greater than zero");
  }
  await assertOwned(req.user._id, {
    account,
    toAccount: type === "transfer" ? toAccount : null,
    category: type === "transfer" ? null : category,
  });
  const template = await RecurringTransaction.create({
    user: req.user._id,
    account,
    toAccount: type === "transfer" ? toAccount || null : null,
    category: type === "transfer" ? null : category || null,
    type,
    amount: cents,
    description: description || "",
    tags: Array.isArray(tags) ? tags : [],
    recurrence,
    nextDueDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
  });
  await template.populate(populateOpts());
  res.status(201).json({
    recurringTransaction: serialize(template),
  });
});
export const updateRecurringTransaction = asyncHandler(async (req, res) => {
  const template = await RecurringTransaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!template) {
    res.status(404);
    throw new Error("Recurring transaction not found");
  }
  const {
    account,
    toAccount,
    category,
    type,
    amount,
    description,
    tags,
    recurrence,
    nextDueDate,
    endDate,
    isActive,
  } = req.body;
  const effectiveType = type ?? template.type;
  if (type !== undefined && !["income", "expense", "transfer"].includes(type)) {
    res.status(400);
    throw new Error("type must be 'income', 'expense', or 'transfer'");
  }
  if (
    recurrence !== undefined &&
    !RECURRING_TXN_RECURRENCE_VALUES.includes(recurrence)
  ) {
    res.status(400);
    throw new Error(
      `recurrence must be one of: ${RECURRING_TXN_RECURRENCE_VALUES.join(", ")}`,
    );
  }
  await assertOwned(req.user._id, {
    account: account ?? template.account,
    toAccount:
      effectiveType === "transfer" ? (toAccount ?? template.toAccount) : null,
    category:
      effectiveType === "transfer" ? null : (category ?? template.category),
  });
  if (account !== undefined) template.account = account;
  if (type !== undefined) template.type = type;
  if (effectiveType === "transfer") {
    template.toAccount = toAccount ?? template.toAccount;
    template.category = null;
  } else if (type !== undefined || category !== undefined) {
    template.toAccount = null;
    if (category !== undefined) template.category = category || null;
  }
  if (amount !== undefined) {
    const cents = toCents(amount);
    if (cents <= 0) {
      res.status(400);
      throw new Error("amount must be greater than zero");
    }
    template.amount = cents;
  }
  if (description !== undefined) template.description = description;
  if (tags !== undefined) template.tags = Array.isArray(tags) ? tags : [];
  if (recurrence !== undefined) template.recurrence = recurrence;
  if (nextDueDate !== undefined) template.nextDueDate = new Date(nextDueDate);
  if (endDate !== undefined)
    template.endDate = endDate ? new Date(endDate) : null;
  if (isActive !== undefined) template.isActive = Boolean(isActive);
  await template.save();
  await template.populate(populateOpts());
  res.json({
    recurringTransaction: serialize(template),
  });
});
export const deleteRecurringTransaction = asyncHandler(async (req, res) => {
  const template = await RecurringTransaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!template) {
    res.status(404);
    throw new Error("Recurring transaction not found");
  }
  await template.deleteOne();
  res.json({
    message: "Recurring transaction deleted",
  });
});
