import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { fromCents } from "./currency.js";
function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return {
    start,
    end,
  };
}
export async function buildMonthlyContext(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const { start: curStart, end: curEnd } = monthRange(0);
  const { start: prevStart, end: prevEnd } = monthRange(-1);
  const [curByType, curByCategory, prevByType] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          user: uid,
          date: {
            $gte: curStart,
            $lt: curEnd,
          },
          type: {
            $in: ["income", "expense"],
          },
        },
      },
      {
        $group: {
          _id: "$type",
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
          date: {
            $gte: curStart,
            $lt: curEnd,
          },
          type: "expense",
        },
      },
      {
        $group: {
          _id: "$category",
          total: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: uid,
          date: {
            $gte: prevStart,
            $lt: prevEnd,
          },
          type: {
            $in: ["income", "expense"],
          },
        },
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
        },
      },
    ]),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.total]));
  const cur = toMap(curByType);
  const prev = toMap(prevByType);
  const topCategories = curByCategory.map((c) => ({
    name: c.category[0]?.name || "Uncategorized",
    total: fromCents(c.total),
    count: c.count,
  }));
  return {
    income: fromCents(cur.income || 0),
    expense: fromCents(cur.expense || 0),
    prevIncome: fromCents(prev.income || 0),
    prevExpense: fromCents(prev.expense || 0),
    topCategories,
  };
}
