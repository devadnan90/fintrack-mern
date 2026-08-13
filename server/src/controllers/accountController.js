import asyncHandler from "express-async-handler";
import Account, { ACCOUNT_TYPE_VALUES } from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { attachBalances } from "../utils/computeBalances.js";
import { toCents, fromCents } from "../utils/currency.js";
function serializeAccount(acc) {
  return {
    id: acc._id,
    name: acc.name,
    type: acc.type,
    institution: acc.institution,
    currency: acc.currency,
    openingBalance: fromCents(acc.openingBalance),
    balance: fromCents(acc.balance),
    isArchived: acc.isArchived,
    createdAt: acc.createdAt,
  };
}
export const listAccounts = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const filter = {
    user: req.user._id,
  };
  if (!includeArchived) filter.isArchived = false;
  const accounts = await Account.find(filter).sort({
    createdAt: 1,
  });
  const withBalances = await attachBalances(req.user._id, accounts);
  res.json({
    accounts: withBalances.map(serializeAccount),
  });
});
export const createAccount = asyncHandler(async (req, res) => {
  const { name, type, institution, currency, openingBalance } = req.body;
  if (!name || !type) {
    res.status(400);
    throw new Error("Name and type are required");
  }
  if (!ACCOUNT_TYPE_VALUES.includes(type)) {
    res.status(400);
    throw new Error(`Type must be one of: ${ACCOUNT_TYPE_VALUES.join(", ")}`);
  }
  const account = await Account.create({
    user: req.user._id,
    name,
    type,
    institution: institution || "",
    currency: (currency || req.user.baseCurrency || "USD").toUpperCase(),
    openingBalance: toCents(openingBalance || 0),
  });
  const [withBalance] = await attachBalances(req.user._id, [account]);
  res.status(201).json({
    account: serializeAccount(withBalance),
  });
});
async function findOwnedAccount(userId, accountId) {
  const account = await Account.findOne({
    _id: accountId,
    user: userId,
  });
  return account;
}
export const getAccount = asyncHandler(async (req, res) => {
  const account = await findOwnedAccount(req.user._id, req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  const [withBalance] = await attachBalances(req.user._id, [account]);
  const transactions = await Transaction.find({
    user: req.user._id,
    $or: [
      {
        account: account._id,
      },
      {
        toAccount: account._id,
      },
    ],
  })
    .sort({
      date: -1,
    })
    .limit(50)
    .populate("category", "name icon color")
    .populate("account", "name")
    .populate("toAccount", "name");
  res.json({
    account: serializeAccount(withBalance),
    recentTransactions: transactions.map((t) => ({
      id: t._id,
      type: t.type,
      amount: fromCents(t.amount),
      date: t.date,
      description: t.description,
      category: t.category
        ? {
            id: t.category._id,
            name: t.category.name,
            icon: t.category.icon,
            color: t.category.color,
          }
        : null,
      account: t.account
        ? {
            id: t.account._id,
            name: t.account.name,
          }
        : null,
      toAccount: t.toAccount
        ? {
            id: t.toAccount._id,
            name: t.toAccount.name,
          }
        : null,
    })),
  });
});
export const updateAccount = asyncHandler(async (req, res) => {
  const account = await findOwnedAccount(req.user._id, req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  const { name, type, institution, currency, isArchived } = req.body;
  if (type && !ACCOUNT_TYPE_VALUES.includes(type)) {
    res.status(400);
    throw new Error(`Type must be one of: ${ACCOUNT_TYPE_VALUES.join(", ")}`);
  }
  if (name !== undefined) account.name = name;
  if (type !== undefined) account.type = type;
  if (institution !== undefined) account.institution = institution;
  if (currency !== undefined) account.currency = currency.toUpperCase();
  if (isArchived !== undefined) account.isArchived = isArchived;
  await account.save();
  const [withBalance] = await attachBalances(req.user._id, [account]);
  res.json({
    account: serializeAccount(withBalance),
  });
});
export const deleteAccount = asyncHandler(async (req, res) => {
  const account = await findOwnedAccount(req.user._id, req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  const txnCount = await Transaction.countDocuments(
    {
      user: req.user._id,
      $or: [
        {
          account: account._id,
        },
        {
          toAccount: account._id,
        },
      ],
    },
    {
      includeDeleted: true,
    },
  );
  if (txnCount > 0) {
    res.status(409);
    throw new Error(
      "This account has existing transactions. Archive it instead of deleting, or delete its transactions first.",
    );
  }
  await account.deleteOne();
  res.json({
    message: "Account deleted",
  });
});
