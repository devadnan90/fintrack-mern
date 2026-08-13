import asyncHandler from "express-async-handler";
import Investment, { INVESTMENT_TYPE_VALUES } from "../models/Investment.js";
import {
  getCryptoPriceCents,
  getStockPriceCents,
} from "../utils/priceProviders.js";
import { toCents, fromCents } from "../utils/currency.js";
async function resolveCurrentPriceCents(investment) {
  if (investment.type === "crypto") {
    const live = await getCryptoPriceCents(investment.symbol);
    if (live !== null)
      return {
        priceCents: live,
        source: "live",
      };
  }
  if (investment.type === "stock") {
    const live = await getStockPriceCents(investment.symbol);
    if (live !== null)
      return {
        priceCents: live,
        source: "live",
      };
  }
  const priceCents = investment.manualPrice ?? investment.purchasePrice;
  return {
    priceCents,
    source: investment.manualPrice != null ? "manual" : "purchase-price",
  };
}
async function serializeInvestment(inv) {
  const { priceCents, source } = await resolveCurrentPriceCents(inv);
  const currentValueCents = Math.round(inv.quantity * priceCents);
  const costBasisCents = Math.round(inv.quantity * inv.purchasePrice);
  const gainLossCents = currentValueCents - costBasisCents;
  return {
    id: inv._id,
    name: inv.name,
    type: inv.type,
    symbol: inv.symbol,
    quantity: inv.quantity,
    currency: inv.currency,
    purchasePrice: fromCents(inv.purchasePrice),
    manualPrice: inv.manualPrice !== null ? fromCents(inv.manualPrice) : null,
    currentPrice: fromCents(priceCents),
    priceSource: source,
    currentValue: fromCents(currentValueCents),
    costBasis: fromCents(costBasisCents),
    gainLoss: fromCents(gainLossCents),
    gainLossPercent:
      costBasisCents > 0
        ? Number(((gainLossCents / costBasisCents) * 100).toFixed(2))
        : 0,
    createdAt: inv.createdAt,
  };
}
export const listInvestments = asyncHandler(async (req, res) => {
  const investments = await Investment.find({
    user: req.user._id,
  }).sort({
    createdAt: -1,
  });
  const serialized = await Promise.all(investments.map(serializeInvestment));
  const portfolioValue = serialized.reduce((sum, i) => sum + i.currentValue, 0);
  const portfolioCost = serialized.reduce((sum, i) => sum + i.costBasis, 0);
  res.json({
    investments: serialized,
    portfolio: {
      currentValue: Math.round(portfolioValue * 100) / 100,
      costBasis: Math.round(portfolioCost * 100) / 100,
      gainLoss: Math.round((portfolioValue - portfolioCost) * 100) / 100,
    },
  });
});
export const createInvestment = asyncHandler(async (req, res) => {
  const { name, type, symbol, quantity, purchasePrice, currency } = req.body;
  if (!name || !type || quantity === undefined || purchasePrice === undefined) {
    res.status(400);
    throw new Error("name, type, quantity, and purchasePrice are required");
  }
  if (!INVESTMENT_TYPE_VALUES.includes(type)) {
    res.status(400);
    throw new Error(
      `type must be one of: ${INVESTMENT_TYPE_VALUES.join(", ")}`,
    );
  }
  if (Number(quantity) <= 0) {
    res.status(400);
    throw new Error("quantity must be greater than zero");
  }
  const investment = await Investment.create({
    user: req.user._id,
    name,
    type,
    symbol: symbol || "",
    quantity: Number(quantity),
    purchasePrice: toCents(purchasePrice),
    currency: (currency || "USD").toUpperCase(),
  });
  res.status(201).json({
    investment: await serializeInvestment(investment),
  });
});
export const updateInvestment = asyncHandler(async (req, res) => {
  const investment = await Investment.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!investment) {
    res.status(404);
    throw new Error("Investment not found");
  }
  const { name, symbol, quantity, purchasePrice, manualPrice, currency } =
    req.body;
  if (name !== undefined) investment.name = name;
  if (symbol !== undefined) investment.symbol = symbol;
  if (quantity !== undefined) investment.quantity = Number(quantity);
  if (purchasePrice !== undefined)
    investment.purchasePrice = toCents(purchasePrice);
  if (manualPrice !== undefined)
    investment.manualPrice = manualPrice === null ? null : toCents(manualPrice);
  if (currency !== undefined) investment.currency = currency.toUpperCase();
  await investment.save();
  res.json({
    investment: await serializeInvestment(investment),
  });
});
export const deleteInvestment = asyncHandler(async (req, res) => {
  const investment = await Investment.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!investment) {
    res.status(404);
    throw new Error("Investment not found");
  }
  await investment.deleteOne();
  res.json({
    message: "Investment deleted",
  });
});
