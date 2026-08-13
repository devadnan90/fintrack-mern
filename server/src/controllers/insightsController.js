import asyncHandler from "express-async-handler";
import { buildMonthlyContext } from "../utils/insightsContext.js";
import {
  ruleBasedSummary,
  ruleBasedAnswer,
} from "../utils/insightsFallback.js";
import { askAi, isAiConfigured } from "../utils/aiProvider.js";
import {
  FREE_AI_QUESTIONS_PER_DAY,
  getRemainingAiQuota,
  consumeAiQuota,
} from "../utils/aiQuota.js";
const SYSTEM_PROMPT =
  "You are a concise personal finance assistant inside a budgeting app called FinTrack. " +
  "You're given a JSON snapshot of the user's current-month finances. Answer in 2-4 short " +
  "sentences, plain language, no markdown, no bullet points. Only use the numbers provided — " +
  "never invent figures.";
export const getSummary = asyncHandler(async (req, res) => {
  const currency = req.user.baseCurrency || "USD";
  const context = await buildMonthlyContext(req.user._id);
  let summary = null;
  let usedAi = false;
  if (isAiConfigured()) {
    try {
      const prompt = `Currency: ${currency}\nData: ${JSON.stringify(context)}\n\nWrite the monthly summary.`;
      summary = await askAi(SYSTEM_PROMPT, prompt);
      usedAi = Boolean(summary);
    } catch {
      summary = null;
    }
  }
  if (!summary) {
    summary = ruleBasedSummary(context, currency);
  }
  res.json({
    summary,
    usedAi,
    stats: context,
  });
});
export const askQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    res.status(400);
    throw new Error("question is required");
  }
  const currency = req.user.baseCurrency || "USD";
  const context = await buildMonthlyContext(req.user._id);
  const aiAvailable = isAiConfigured();
  const isPremium = req.user.hasActivePremium();
  const remainingQuota = isPremium
    ? Infinity
    : getRemainingAiQuota(req.user.aiUsage);
  const limitReached = aiAvailable && !isPremium && remainingQuota <= 0;
  let answer = null;
  let usedAi = false;
  if (aiAvailable && !limitReached) {
    try {
      const prompt = `Currency: ${currency}\nData: ${JSON.stringify(context)}\n\nUser question: ${question}`;
      answer = await askAi(SYSTEM_PROMPT, prompt);
      usedAi = Boolean(answer);
      if (usedAi && !isPremium) {
        req.user.aiUsage = consumeAiQuota(req.user.aiUsage);
        await req.user.save();
      }
    } catch {
      answer = null;
    }
  }
  if (!answer) {
    answer = ruleBasedAnswer(question, context, currency);
  }
  res.json({
    answer,
    usedAi,
    limitReached,
    dailyLimit: aiAvailable && !isPremium ? FREE_AI_QUESTIONS_PER_DAY : null,
  });
});
