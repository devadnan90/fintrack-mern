import asyncHandler from "express-async-handler";
import SplitBill from "../models/SplitBill.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Account from "../models/Account.js";
import { toCents, fromCents } from "../utils/currency.js";
import { generatePaymentRequestPdf } from "../utils/paymentRequestPdf.js";
function serializeSplit(split) {
  const totalOwed = split.participants.reduce(
    (sum, p) => sum + p.shareAmount,
    0,
  );
  const totalSettled = split.participants
    .filter((p) => p.settled)
    .reduce((sum, p) => sum + p.shareAmount, 0);
  return {
    id: split._id,
    transaction: split.transaction._id
      ? {
          id: split.transaction._id,
          description: split.transaction.description,
          amount: fromCents(split.transaction.amount),
          date: split.transaction.date,
        }
      : split.transaction,
    participants: split.participants.map((p) => ({
      id: p._id,
      name: p.name,
      email: p.email,
      shareAmount: fromCents(p.shareAmount),
      settled: p.settled,
      settledAt: p.settledAt,
    })),
    totalOwed: fromCents(totalOwed),
    totalOutstanding: fromCents(totalOwed - totalSettled),
    fullySettled: split.participants.every((p) => p.settled),
    createdAt: split.createdAt,
  };
}
export const listSplitBills = asyncHandler(async (req, res) => {
  const splits = await SplitBill.find({
    user: req.user._id,
  })
    .sort({
      createdAt: -1,
    })
    .populate("transaction", "description amount date");
  res.json({
    splits: splits.map(serializeSplit),
  });
});
export const createSplitBill = asyncHandler(async (req, res) => {
  const { transaction: transactionId, participants } = req.body;
  if (
    !transactionId ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    res.status(400);
    throw new Error("transaction and at least one participant are required");
  }
  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: req.user._id,
    type: "expense",
  });
  if (!transaction) {
    res.status(400);
    throw new Error("transaction not found, or it isn't an expense you own");
  }
  const existing = await SplitBill.findOne({
    transaction: transactionId,
  });
  if (existing) {
    res.status(409);
    throw new Error("This transaction already has a split. Edit it instead.");
  }
  const participantDocs = participants.map((p) => {
    if (
      !p.name ||
      !p.name.trim() ||
      p.shareAmount === undefined ||
      p.shareAmount === null
    ) {
      const err = new Error("Each participant needs a name and a share amount");
      err.status = 400;
      throw err;
    }
    const shareCents = toCents(p.shareAmount);
    if (shareCents <= 0) {
      const err = new Error("Share amounts must be greater than zero");
      err.status = 400;
      throw err;
    }
    return {
      name: p.name.trim(),
      email: (p.email || "").trim().toLowerCase(),
      shareAmount: shareCents,
    };
  });
  const totalShares = participantDocs.reduce(
    (sum, p) => sum + p.shareAmount,
    0,
  );
  if (totalShares > transaction.amount) {
    res.status(400);
    throw new Error(
      "Participant shares can't add up to more than the transaction total",
    );
  }
  const split = await SplitBill.create({
    user: req.user._id,
    transaction: transactionId,
    participants: participantDocs,
  });
  await split.populate("transaction", "description amount date");
  res.status(201).json({
    split: serializeSplit(split),
  });
});
export const updateSplitBill = asyncHandler(async (req, res) => {
  const split = await SplitBill.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("transaction", "description amount date");
  if (!split) {
    res.status(404);
    throw new Error("Split not found");
  }
  const { participants } = req.body;
  if (participants !== undefined) {
    if (!Array.isArray(participants) || participants.length === 0) {
      res.status(400);
      throw new Error("At least one participant is required");
    }
    const participantDocs = participants.map((p) => {
      if (
        !p.name ||
        !p.name.trim() ||
        p.shareAmount === undefined ||
        p.shareAmount === null
      ) {
        const err = new Error(
          "Each participant needs a name and a share amount",
        );
        err.status = 400;
        throw err;
      }
      const shareCents = toCents(p.shareAmount);
      if (shareCents <= 0) {
        const err = new Error("Share amounts must be greater than zero");
        err.status = 400;
        throw err;
      }
      return {
        name: p.name.trim(),
        email: (p.email || "").trim().toLowerCase(),
        shareAmount: shareCents,
        settled: Boolean(p.settled),
        settledAt: p.settled ? p.settledAt || new Date() : null,
      };
    });
    const totalShares = participantDocs.reduce(
      (sum, p) => sum + p.shareAmount,
      0,
    );
    if (totalShares > split.transaction.amount) {
      res.status(400);
      throw new Error(
        "Participant shares can't add up to more than the transaction total",
      );
    }
    split.participants = participantDocs;
  }
  await split.save();
  res.json({
    split: serializeSplit(split),
  });
});
export const settleParticipant = asyncHandler(async (req, res) => {
  const split = await SplitBill.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("transaction");
  if (!split) {
    res.status(404);
    throw new Error("Split not found");
  }
  const participant = split.participants.id(req.params.participantId);
  if (!participant) {
    res.status(404);
    throw new Error("Participant not found");
  }
  if (participant.settled) {
    res.status(409);
    throw new Error("This participant is already marked as settled");
  }
  participant.settled = true;
  participant.settledAt = new Date();
  await split.save();
  let repaymentTransaction = null;
  if (req.body.recordAsIncome) {
    let category = null;
    if (split.transaction.category) {
      category = split.transaction.category;
    } else {
      const incomeCategory = await Category.findOne({
        user: req.user._id,
        type: "income",
      });
      category = incomeCategory?._id || null;
    }
    repaymentTransaction = await Transaction.create({
      user: req.user._id,
      account: split.transaction.account,
      category,
      type: "income",
      amount: participant.shareAmount,
      date: new Date(),
      description: `${participant.name} paid you back for "${split.transaction.description || "a shared expense"}"`,
    });
  }
  res.json({
    split: serializeSplit(split),
    repaymentTransaction: repaymentTransaction?._id || null,
  });
});
export const downloadPaymentRequest = asyncHandler(async (req, res) => {
  const split = await SplitBill.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("transaction", "description amount date account");
  if (!split) {
    res.status(404);
    throw new Error("Split not found");
  }
  const participant = split.participants.id(req.params.participantId);
  if (!participant) {
    res.status(404);
    throw new Error("Participant not found");
  }
  let currency = "USD";
  if (split.transaction.account) {
    const account = await Account.findById(split.transaction.account).select(
      "currency",
    );
    currency = account?.currency || "USD";
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="payment-request-${participant.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
  );
  generatePaymentRequestPdf(res, {
    requester: {
      name: req.user.name,
      email: req.user.email,
    },
    participant: {
      name: participant.name,
      email: participant.email,
      shareAmount: fromCents(participant.shareAmount),
    },
    description: split.transaction.description,
    expenseDate: split.transaction.date,
    totalAmount: fromCents(split.transaction.amount),
    currency,
  });
});
export const deleteSplitBill = asyncHandler(async (req, res) => {
  const split = await SplitBill.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!split) {
    res.status(404);
    throw new Error("Split not found");
  }
  await split.deleteOne();
  res.json({
    message: "Split deleted",
  });
});
