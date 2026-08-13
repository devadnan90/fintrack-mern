const PLAN_DEFS = [
  {
    id: "monthly",
    days: 30,
    envVar: "RAZORPAY_PLAN_MONTHLY_AMOUNT",
    defaultAmount: 9900,
  },
  {
    id: "quarterly",
    days: 90,
    envVar: "RAZORPAY_PLAN_QUARTERLY_AMOUNT",
    defaultAmount: 19900,
  },
  {
    id: "yearly",
    days: 365,
    envVar: "RAZORPAY_PLAN_YEARLY_AMOUNT",
    defaultAmount: 49900,
  },
];
export function getPremiumPlans() {
  const currency = process.env.RAZORPAY_CURRENCY || "INR";
  return PLAN_DEFS.map((def) => ({
    id: def.id,
    days: def.days,
    currency,
    amount: Number(process.env[def.envVar]) || def.defaultAmount,
  }));
}
export function getPremiumPlanById(planId) {
  return getPremiumPlans().find((p) => p.id === planId) || null;
}
export function computeNewExpiry(currentExpiresAt, planDays, now = new Date()) {
  const base =
    currentExpiresAt && currentExpiresAt > now ? currentExpiresAt : now;
  return new Date(base.getTime() + planDays * 86_400_000);
}
