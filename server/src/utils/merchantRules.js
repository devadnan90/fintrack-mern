import MerchantRule from "../models/MerchantRule.js";
export async function loadRules(userId) {
  return MerchantRule.find({
    user: userId,
  }).sort({
    pattern: 1,
  });
}
export function matchRule(rules, description) {
  const haystack = String(description || "")
    .toLowerCase()
    .trim();
  if (!haystack) return null;
  let best = null;
  for (const rule of rules) {
    const pattern = rule.pattern;
    const isMatch =
      rule.matchType === "exact"
        ? haystack === pattern
        : haystack.includes(pattern);
    if (!isMatch) continue;
    const rank = rule.matchType === "exact" ? 1 : 0;
    if (
      !best ||
      rank > best.rank ||
      (rank === best.rank && pattern.length > best.pattern.length)
    ) {
      best = {
        rule,
        rank,
        pattern,
      };
    }
  }
  return best ? best.rule : null;
}
export async function resolveCategoryFromDescription(userId, description) {
  const rules = await loadRules(userId);
  const match = matchRule(rules, description);
  return match ? match.category : null;
}
