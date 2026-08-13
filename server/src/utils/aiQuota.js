export const FREE_AI_QUESTIONS_PER_DAY = 3;
export function todayUtcKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function getRemainingAiQuota(
  aiUsage,
  limit = FREE_AI_QUESTIONS_PER_DAY,
  now = new Date(),
) {
  const key = todayUtcKey(now);
  const count = aiUsage?.date === key ? aiUsage.count : 0;
  return Math.max(0, limit - count);
}
export function consumeAiQuota(aiUsage, now = new Date()) {
  const key = todayUtcKey(now);
  const count = aiUsage?.date === key ? aiUsage.count : 0;
  return {
    date: key,
    count: count + 1,
  };
}
