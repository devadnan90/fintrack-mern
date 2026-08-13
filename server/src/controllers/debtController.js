import asyncHandler from "express-async-handler";
import Debt from "../models/Debt.js";
import { computePayoffPlan } from "../utils/debtPayoff.js";
import { toCents, fromCents } from "../utils/currency.js";
function serialize(d) {
  return {
    id: d._id,
    name: d.name,
    balance: fromCents(d.balance),
    apr: d.apr,
    minimumPayment: fromCents(d.minimumPayment),
  };
}
export const listDebts = asyncHandler(async (req, res) => {
  const debts = await Debt.find({
    user: req.user._id,
  }).sort({
    createdAt: 1,
  });
  res.json({
    debts: debts.map(serialize),
  });
});
export const createDebt = asyncHandler(async (req, res) => {
  const { name, balance, apr, minimumPayment } = req.body;
  if (
    !name ||
    balance === undefined ||
    apr === undefined ||
    minimumPayment === undefined
  ) {
    res.status(400);
    throw new Error("name, balance, apr, and minimumPayment are required");
  }
  const debt = await Debt.create({
    user: req.user._id,
    name,
    balance: toCents(balance),
    apr: Number(apr),
    minimumPayment: toCents(minimumPayment),
  });
  res.status(201).json({
    debt: serialize(debt),
  });
});
export const updateDebt = asyncHandler(async (req, res) => {
  const debt = await Debt.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!debt) {
    res.status(404);
    throw new Error("Debt not found");
  }
  const { name, balance, apr, minimumPayment } = req.body;
  if (name !== undefined) debt.name = name;
  if (balance !== undefined) debt.balance = toCents(balance);
  if (apr !== undefined) debt.apr = Number(apr);
  if (minimumPayment !== undefined)
    debt.minimumPayment = toCents(minimumPayment);
  await debt.save();
  res.json({
    debt: serialize(debt),
  });
});
export const deleteDebt = asyncHandler(async (req, res) => {
  const debt = await Debt.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!debt) {
    res.status(404);
    throw new Error("Debt not found");
  }
  await debt.deleteOne();
  res.json({
    message: "Debt deleted",
  });
});
export const getPayoffPlan = asyncHandler(async (req, res) => {
  const strategy = req.query.strategy === "snowball" ? "snowball" : "avalanche";
  const extraMonthlyPayment = toCents(
    Number(req.query.extraMonthlyPayment) || 0,
  );
  const debts = await Debt.find({
    user: req.user._id,
  }).sort({
    createdAt: 1,
  });
  const plan = computePayoffPlan(
    debts.map((d) => ({
      id: d._id,
      name: d.name,
      balance: d.balance,
      apr: d.apr,
      minimumPayment: d.minimumPayment,
    })),
    {
      strategy,
      extraMonthlyPayment,
    },
  );
  res.json({
    strategy,
    extraMonthlyPayment: fromCents(extraMonthlyPayment),
    months: plan.months,
    payoffDate: plan.payoffDate,
    totalInterestPaid: fromCents(plan.totalInterestPaid),
    neverPaidOff: plan.neverPaidOff,
    perDebt: plan.perDebt.map((d) => ({
      id: d.id,
      name: d.name,
      interestPaid: fromCents(d.interestPaid),
      monthsToPayoff: d.monthsToPayoff,
    })),
  });
});
