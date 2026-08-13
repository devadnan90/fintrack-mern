import asyncHandler from "express-async-handler";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import SplitBill from "../models/SplitBill.js";
import { toCents, fromCents } from "../utils/currency.js";
import {
  parseCsvBuffer,
  guessMapping,
  evaluateRow,
  MAX_IMPORT_ROWS,
} from "../utils/csvImport.js";
import { generateDueRecurringTransactions } from "../utils/recurringTransactions.js";
import {
  resolveCategoryFromDescription,
  loadRules,
} from "../utils/merchantRules.js";
import { applyRoundUp } from "../utils/roundUpSavings.js";
function serializeTransaction(t) {
  return {
    id: t._id,
    type: t.type,
    amount: fromCents(t.amount),
    date: t.date,
    description: t.description,
    tags: t.tags,
    attachmentUrl: t.attachmentUrl,
    isRecurring: Boolean(t.generatedFrom),
    account:
      t.account && t.account._id
        ? {
            id: t.account._id,
            name: t.account.name,
          }
        : t.account,
    toAccount:
      t.toAccount && t.toAccount._id
        ? {
            id: t.toAccount._id,
            name: t.toAccount.name,
          }
        : t.toAccount,
    category:
      t.category && t.category._id
        ? {
            id: t.category._id,
            name: t.category.name,
            icon: t.category.icon,
            color: t.category.color,
          }
        : t.category,
    splits: (t.splits || []).map((s) => ({
      category:
        s.category && s.category._id
          ? {
              id: s.category._id,
              name: s.category.name,
              icon: s.category.icon,
              color: s.category.color,
            }
          : s.category,
      amount: fromCents(s.amount),
    })),
    createdAt: t.createdAt,
  };
}
async function assertOwnedAccount(userId, accountId, label = "account") {
  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });
  if (!account) {
    const err = new Error(`${label} not found or does not belong to you`);
    err.status = 400;
    throw err;
  }
  return account;
}
async function assertOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
  });
  if (!category) {
    const err = new Error("Category not found or does not belong to you");
    err.status = 400;
    throw err;
  }
  return category;
}
const MAX_ATTACHMENT_LENGTH = 2_000_000;
function buildPayload(userId, body) {
  const {
    account,
    toAccount,
    category,
    type,
    amount,
    date,
    description,
    tags,
    attachmentUrl,
    splits,
  } = body;
  if (!account || !type || amount === undefined || amount === null) {
    const err = new Error("account, type, and amount are required");
    err.status = 400;
    throw err;
  }
  if (!["income", "expense", "transfer"].includes(type)) {
    const err = new Error("type must be 'income', 'expense', or 'transfer'");
    err.status = 400;
    throw err;
  }
  const cents = toCents(amount);
  if (cents <= 0) {
    const err = new Error("amount must be greater than zero");
    err.status = 400;
    throw err;
  }
  if (attachmentUrl && attachmentUrl.length > MAX_ATTACHMENT_LENGTH) {
    const err = new Error("Receipt image is too large");
    err.status = 400;
    throw err;
  }
  let splitDocs = [];
  if (Array.isArray(splits) && splits.length > 0) {
    if (type === "transfer") {
      const err = new Error("Transfers cannot be split across categories");
      err.status = 400;
      throw err;
    }
    if (splits.length < 2) {
      const err = new Error(
        "A split transaction needs at least two categories",
      );
      err.status = 400;
      throw err;
    }
    splitDocs = splits.map((s) => {
      if (!s.category || s.amount === undefined || s.amount === null) {
        const err = new Error("Each split needs a category and an amount");
        err.status = 400;
        throw err;
      }
      const splitCents = toCents(s.amount);
      if (splitCents <= 0) {
        const err = new Error("Split amounts must be greater than zero");
        err.status = 400;
        throw err;
      }
      return {
        category: s.category,
        amount: splitCents,
      };
    });
    const sum = splitDocs.reduce((total, s) => total + s.amount, 0);
    if (sum !== cents) {
      const err = new Error(
        "Split amounts must add up to the transaction total",
      );
      err.status = 400;
      throw err;
    }
  }
  return {
    user: userId,
    account,
    toAccount: type === "transfer" ? toAccount || null : null,
    category:
      type === "transfer" || splitDocs.length > 0 ? null : category || null,
    splits: splitDocs,
    type,
    amount: cents,
    date: date ? new Date(date) : new Date(),
    description: description || "",
    tags: Array.isArray(tags) ? tags : [],
    attachmentUrl: attachmentUrl || "",
  };
}
export const createTransaction = asyncHandler(async (req, res) => {
  const payload = buildPayload(req.user._id, req.body);
  if (
    !payload.category &&
    payload.splits.length === 0 &&
    payload.type !== "transfer"
  ) {
    const matched = await resolveCategoryFromDescription(
      req.user._id,
      payload.description,
    );
    if (matched) payload.category = matched;
  }
  await assertOwnedAccount(req.user._id, payload.account, "account");
  if (payload.toAccount)
    await assertOwnedAccount(req.user._id, payload.toAccount, "toAccount");
  if (payload.category)
    await assertOwnedCategory(req.user._id, payload.category);
  for (const split of payload.splits) {
    await assertOwnedCategory(req.user._id, split.category);
  }
  const transaction = await Transaction.create(payload);
  await transaction.populate([
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
    {
      path: "splits.category",
      select: "name icon color",
    },
  ]);
  const roundUp = await applyRoundUp(req.user, transaction);
  if (roundUp)
    await roundUp.populate([
      {
        path: "account",
        select: "name",
      },
      {
        path: "toAccount",
        select: "name",
      },
    ]);
  res.status(201).json({
    transaction: {
      ...serializeTransaction(transaction),
      roundUp: roundUp ? serializeTransaction(roundUp) : null,
    },
  });
});
export const listTransactions = asyncHandler(async (req, res) => {
  await generateDueRecurringTransactions(req.user._id);
  const {
    account,
    category,
    type,
    dateFrom,
    dateTo,
    search,
    tag,
    page = 1,
    limit = 25,
  } = req.query;
  const filter = {
    user: req.user._id,
  };
  if (account) filter.account = account;
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  if (search) {
    filter.description = {
      $regex: search,
      $options: "i",
    };
  }
  if (tag) {
    filter.tags = {
      $regex: `^${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    };
  }
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("account", "name")
      .populate("toAccount", "name")
      .populate("category", "name icon color")
      .populate("splits.category", "name icon color"),
    Transaction.countDocuments(filter),
  ]);
  res.json({
    transactions: transactions.map(serializeTransaction),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});
export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
    .populate("account", "name")
    .populate("toAccount", "name")
    .populate("category", "name icon color")
    .populate("splits.category", "name icon color");
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  res.json({
    transaction: serializeTransaction(transaction),
  });
});
export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  const existingSplits = transaction.splits.map((s) => ({
    category: s.category,
    amount: fromCents(s.amount),
  }));
  const payload = buildPayload(req.user._id, {
    account: req.body.account ?? transaction.account,
    toAccount: req.body.toAccount ?? transaction.toAccount,
    category: req.body.category ?? transaction.category,
    type: req.body.type ?? transaction.type,
    amount: req.body.amount ?? fromCents(transaction.amount),
    date: req.body.date ?? transaction.date,
    description: req.body.description ?? transaction.description,
    tags: req.body.tags ?? transaction.tags,
    attachmentUrl: req.body.attachmentUrl ?? transaction.attachmentUrl,
    splits: req.body.splits ?? existingSplits,
  });
  await assertOwnedAccount(req.user._id, payload.account, "account");
  if (payload.toAccount)
    await assertOwnedAccount(req.user._id, payload.toAccount, "toAccount");
  if (payload.category)
    await assertOwnedCategory(req.user._id, payload.category);
  for (const split of payload.splits) {
    await assertOwnedCategory(req.user._id, split.category);
  }
  Object.assign(transaction, payload);
  await transaction.save();
  await transaction.populate([
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
    {
      path: "splits.category",
      select: "name icon color",
    },
  ]);
  res.json({
    transaction: serializeTransaction(transaction),
  });
});
export const FREE_TRASH_RETENTION_DAYS = 30;
export const PREMIUM_TRASH_RETENTION_DAYS = 90;
export function trashRetentionDaysFor(user) {
  return user.hasActivePremium()
    ? PREMIUM_TRASH_RETENTION_DAYS
    : FREE_TRASH_RETENTION_DAYS;
}
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }
  transaction.deletedAt = new Date();
  await transaction.save();
  res.json({
    message: "Transaction deleted",
    id: transaction._id,
    deletedAt: transaction.deletedAt,
  });
});
export const restoreTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
    deletedAt: {
      $ne: null,
    },
  });
  if (!transaction) {
    res.status(404);
    throw new Error("Deleted transaction not found");
  }
  transaction.deletedAt = null;
  await transaction.save();
  await transaction.populate([
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
    {
      path: "splits.category",
      select: "name icon color",
    },
  ]);
  res.json({
    transaction: serializeTransaction(transaction),
  });
});
export const listTrash = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({
    user: req.user._id,
    deletedAt: {
      $ne: null,
    },
  })
    .sort({
      deletedAt: -1,
    })
    .populate("account", "name")
    .populate("category", "name icon color")
    .populate("splits.category", "name icon color");
  res.json({
    transactions: transactions.map((t) => ({
      ...serializeTransaction(t),
      deletedAt: t.deletedAt,
    })),
    retentionDays: trashRetentionDaysFor(req.user),
  });
});
export const permanentlyDeleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
    deletedAt: {
      $ne: null,
    },
  });
  if (!transaction) {
    res.status(404);
    throw new Error("Deleted transaction not found");
  }
  await transaction.deleteOne();
  await SplitBill.deleteOne({
    transaction: transaction._id,
  });
  res.json({
    message: "Transaction permanently deleted",
  });
});
const MAX_BULK_IDS = 500;
function parseBulkIds(req) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    const err = new Error("ids must be a non-empty array");
    err.status = 400;
    throw err;
  }
  if (ids.length > MAX_BULK_IDS) {
    const err = new Error(
      `Cannot act on more than ${MAX_BULK_IDS} transactions at once`,
    );
    err.status = 400;
    throw err;
  }
  return ids;
}
export function isEligibleForBulkCategory(transaction) {
  return (
    transaction.type !== "transfer" && (transaction.splits?.length || 0) === 0
  );
}
export const bulkDeleteTransactions = asyncHandler(async (req, res) => {
  const ids = parseBulkIds(req);
  const result = await Transaction.updateMany(
    {
      _id: {
        $in: ids,
      },
      user: req.user._id,
      deletedAt: null,
    },
    {
      $set: {
        deletedAt: new Date(),
      },
    },
  );
  res.json({
    deletedCount: result.modifiedCount,
  });
});
export const bulkRestoreTransactions = asyncHandler(async (req, res) => {
  const ids = parseBulkIds(req);
  const result = await Transaction.updateMany(
    {
      _id: {
        $in: ids,
      },
      user: req.user._id,
      deletedAt: {
        $ne: null,
      },
    },
    {
      $set: {
        deletedAt: null,
      },
    },
  );
  res.json({
    restoredCount: result.modifiedCount,
  });
});
export const bulkUpdateTransactions = asyncHandler(async (req, res) => {
  const ids = parseBulkIds(req);
  const { category, addTags, removeTags } = req.body;
  if (
    category === undefined &&
    addTags === undefined &&
    removeTags === undefined
  ) {
    res.status(400);
    throw new Error("Provide at least one of category, addTags, or removeTags");
  }
  const owned = await Transaction.find({
    _id: {
      $in: ids,
    },
    user: req.user._id,
  }).select("_id type splits");
  const ownedIds = owned.map((t) => t._id);
  let categoryUpdatedCount = 0;
  let categorySkippedCount = 0;
  if (category !== undefined) {
    if (category !== null) await assertOwnedCategory(req.user._id, category);
    const eligibleIds = owned
      .filter(isEligibleForBulkCategory)
      .map((t) => t._id);
    categorySkippedCount = ownedIds.length - eligibleIds.length;
    if (eligibleIds.length > 0) {
      const result = await Transaction.updateMany(
        {
          _id: {
            $in: eligibleIds,
          },
          user: req.user._id,
        },
        {
          $set: {
            category: category || null,
          },
        },
      );
      categoryUpdatedCount = result.modifiedCount;
    }
  }
  if (Array.isArray(addTags) && addTags.length > 0) {
    await Transaction.updateMany(
      {
        _id: {
          $in: ownedIds,
        },
        user: req.user._id,
      },
      {
        $addToSet: {
          tags: {
            $each: addTags,
          },
        },
      },
    );
  }
  if (Array.isArray(removeTags) && removeTags.length > 0) {
    await Transaction.updateMany(
      {
        _id: {
          $in: ownedIds,
        },
        user: req.user._id,
      },
      {
        $pullAll: {
          tags: removeTags,
        },
      },
    );
  }
  res.json({
    matchedCount: ownedIds.length,
    categoryUpdatedCount,
    categorySkippedCount,
  });
});
function parseUploadedCsv(req) {
  if (!req.file) {
    const err = new Error(
      "No CSV file was uploaded (field name must be 'file')",
    );
    err.status = 400;
    throw err;
  }
  let rows;
  try {
    rows = parseCsvBuffer(req.file.buffer);
  } catch (err) {
    const wrapped = new Error(`Could not parse CSV: ${err.message}`);
    wrapped.status = 400;
    throw wrapped;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    const err = new Error(
      `CSV has ${rows.length} rows; the limit is ${MAX_IMPORT_ROWS} per import`,
    );
    err.status = 400;
    throw err;
  }
  return rows;
}
function parseMapping(req) {
  if (!req.body.mapping) return null;
  try {
    return JSON.parse(req.body.mapping);
  } catch {
    const err = new Error("mapping must be valid JSON");
    err.status = 400;
    throw err;
  }
}
export const previewImport = asyncHandler(async (req, res) => {
  const rows = parseUploadedCsv(req);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const mapping = parseMapping(req);
  if (!mapping) {
    res.json({
      headers,
      totalRows: rows.length,
      sampleRows: rows.slice(0, 5),
      suggestedMapping: guessMapping(headers),
    });
    return;
  }
  const [accounts, categories, merchantRules] = await Promise.all([
    Account.find({
      user: req.user._id,
    }),
    Category.find({
      user: req.user._id,
    }),
    loadRules(req.user._id),
  ]);
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c]),
  );
  const results = [];
  const summary = {
    ok: 0,
    duplicate: 0,
    error: 0,
  };
  for (let i = 0; i < rows.length; i += 1) {
    const evaluation = await evaluateRow(req.user._id, rows[i], mapping, {
      accountByName,
      categoryByName,
      merchantRules,
    });
    summary[evaluation.status] += 1;
    results.push({
      row: i + 2,
      raw: rows[i],
      ...evaluation,
    });
  }
  res.json({
    results,
    summary,
    totalRows: rows.length,
  });
});
export const importTransactions = asyncHandler(async (req, res) => {
  const rows = parseUploadedCsv(req);
  const mapping = parseMapping(req);
  const [accounts, categories, merchantRules] = await Promise.all([
    Account.find({
      user: req.user._id,
    }),
    Category.find({
      user: req.user._id,
    }),
    loadRules(req.user._id),
  ]);
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c]),
  );
  const results = {
    imported: 0,
    skipped: 0,
    errors: [],
  };
  const toInsert = [];
  for (let i = 0; i < rows.length; i += 1) {
    const evaluation = await evaluateRow(req.user._id, rows[i], mapping, {
      accountByName,
      categoryByName,
      merchantRules,
    });
    if (evaluation.status === "error") {
      results.errors.push({
        row: i + 2,
        message: evaluation.message,
      });
    } else if (evaluation.status === "duplicate") {
      results.skipped += 1;
    } else {
      toInsert.push(evaluation.data);
    }
  }
  if (toInsert.length) {
    const inserted = await Transaction.insertMany(toInsert, {
      ordered: false,
    });
    results.imported = inserted.length;
  }
  res.json(results);
});
