import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
export async function computeBalanceDeltas(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const [incomeSums, expenseSums, transferOutSums, transferInSums] =
    await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: uid,
            type: "income",
          },
        },
        {
          $group: {
            _id: "$account",
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: uid,
            type: "expense",
          },
        },
        {
          $group: {
            _id: "$account",
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: uid,
            type: "transfer",
          },
        },
        {
          $group: {
            _id: "$account",
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: uid,
            type: "transfer",
            toAccount: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: "$toAccount",
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),
    ]);
  const deltas = new Map();
  const add = (accountId, delta) => {
    const key = String(accountId);
    deltas.set(key, (deltas.get(key) || 0) + delta);
  };
  incomeSums.forEach((r) => add(r._id, r.total));
  expenseSums.forEach((r) => add(r._id, -r.total));
  transferOutSums.forEach((r) => add(r._id, -r.total));
  transferInSums.forEach((r) => add(r._id, r.total));
  return deltas;
}
export async function attachBalances(userId, accounts) {
  const deltas = await computeBalanceDeltas(userId);
  return accounts.map((acc) => {
    const obj = acc.toObject ? acc.toObject() : acc;
    const delta = deltas.get(String(obj._id)) || 0;
    return {
      ...obj,
      balance: obj.openingBalance + delta,
    };
  });
}
