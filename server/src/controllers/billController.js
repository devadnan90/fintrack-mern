import asyncHandler from "express-async-handler";
import Bill, { RECURRENCE_TYPE_VALUES } from "../models/Bill.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import { nextOccurrence } from "../utils/recurrence.js";
import { toCents, fromCents } from "../utils/currency.js";
function computeStatus(bill) {
  if (bill.paidAt) return "paid";
  return bill.dueDate < new Date() ? "overdue" : "upcoming";
}
function serializeBill(bill) {
  return {
    id: bill._id,
    name: bill.name,
    amount: fromCents(bill.amount),
    dueDate: bill.dueDate,
    recurrence: bill.recurrence,
    account: bill.account?._id
      ? {
          id: bill.account._id,
          name: bill.account.name,
        }
      : bill.account,
    category: bill.category?._id
      ? {
          id: bill.category._id,
          name: bill.category.name,
        }
      : bill.category,
    reminderDaysBefore: bill.reminderDaysBefore,
    paidAt: bill.paidAt,
    status: computeStatus(bill),
  };
}
export const listBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find({
    user: req.user._id,
  })
    .sort({
      dueDate: 1,
    })
    .populate("account", "name")
    .populate("category", "name");
  res.json({
    bills: bills.map(serializeBill),
  });
});
export const createBill = asyncHandler(async (req, res) => {
  const {
    name,
    amount,
    dueDate,
    recurrence,
    account,
    category,
    reminderDaysBefore,
  } = req.body;
  if (!name || amount === undefined || !dueDate || !account) {
    res.status(400);
    throw new Error("name, amount, dueDate, and account are required");
  }
  if (recurrence && !RECURRENCE_TYPE_VALUES.includes(recurrence)) {
    res.status(400);
    throw new Error(
      `recurrence must be one of: ${RECURRENCE_TYPE_VALUES.join(", ")}`,
    );
  }
  const accountDoc = await Account.findOne({
    _id: account,
    user: req.user._id,
  });
  if (!accountDoc) {
    res.status(400);
    throw new Error("account does not exist");
  }
  if (category) {
    const categoryDoc = await Category.findOne({
      _id: category,
      user: req.user._id,
    });
    if (!categoryDoc) {
      res.status(400);
      throw new Error("category does not exist");
    }
  }
  const bill = await Bill.create({
    user: req.user._id,
    name,
    amount: toCents(amount),
    dueDate: new Date(dueDate),
    recurrence: recurrence || "none",
    account,
    category: category || null,
    reminderDaysBefore: reminderDaysBefore ?? 3,
  });
  await bill.populate([
    {
      path: "account",
      select: "name",
    },
    {
      path: "category",
      select: "name",
    },
  ]);
  res.status(201).json({
    bill: serializeBill(bill),
  });
});
export const updateBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }
  const {
    name,
    amount,
    dueDate,
    recurrence,
    account,
    category,
    reminderDaysBefore,
  } = req.body;
  if (name !== undefined) bill.name = name;
  if (amount !== undefined) bill.amount = toCents(amount);
  if (dueDate !== undefined) bill.dueDate = new Date(dueDate);
  if (recurrence !== undefined) {
    if (!RECURRENCE_TYPE_VALUES.includes(recurrence)) {
      res.status(400);
      throw new Error(
        `recurrence must be one of: ${RECURRENCE_TYPE_VALUES.join(", ")}`,
      );
    }
    bill.recurrence = recurrence;
  }
  if (account !== undefined) bill.account = account;
  if (category !== undefined) bill.category = category || null;
  if (reminderDaysBefore !== undefined)
    bill.reminderDaysBefore = reminderDaysBefore;
  await bill.save();
  await bill.populate([
    {
      path: "account",
      select: "name",
    },
    {
      path: "category",
      select: "name",
    },
  ]);
  res.json({
    bill: serializeBill(bill),
  });
});
export const markBillPaid = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }
  const transaction = await Transaction.create({
    user: req.user._id,
    account: bill.account,
    category: bill.category,
    type: "expense",
    amount: bill.amount,
    date: new Date(),
    description: `Paid: ${bill.name}`,
    generatedFromBill: bill._id,
  });
  const next = nextOccurrence(bill.dueDate, bill.recurrence);
  if (next) {
    bill.dueDate = next;
    bill.paidAt = null;
  } else {
    bill.paidAt = new Date();
  }
  await bill.save();
  await bill.populate([
    {
      path: "account",
      select: "name",
    },
    {
      path: "category",
      select: "name",
    },
  ]);
  res.json({
    bill: serializeBill(bill),
    transactionId: transaction._id,
  });
});
export const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }
  await bill.deleteOne();
  res.json({
    message: "Bill deleted",
  });
});
