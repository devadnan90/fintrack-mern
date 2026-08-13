function money(amount, currency) {
  return `${amount.toFixed(2)} ${currency}`;
}
function pctChange(cur, prev) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}
export function ruleBasedSummary(context, currency) {
  const { income, expense, prevExpense, topCategories } = context;
  if (income === 0 && expense === 0) {
    return "No transactions recorded yet this month — add some income or expenses and check back here.";
  }
  const parts = [
    `This month you've earned ${money(income, currency)} and spent ${money(expense, currency)}.`,
  ];
  if (prevExpense > 0) {
    const change = pctChange(expense, prevExpense);
    if (change > 0) parts.push(`That's ${change}% more than last month.`);
    else if (change < 0)
      parts.push(`That's ${Math.abs(change)}% less than last month — nice.`);
    else parts.push("That's about the same as last month.");
  }
  if (topCategories.length) {
    const top = topCategories[0];
    parts.push(
      `Your biggest expense category is ${top.name} at ${money(top.total, currency)}.`,
    );
  }
  const net = income - expense;
  parts.push(
    net >= 0
      ? `You're net positive by ${money(net, currency)} this month.`
      : `You're spending ${money(Math.abs(net), currency)} more than you're earning this month.`,
  );
  return parts.join(" ");
}
function categoryWords(name) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}
export function ruleBasedAnswer(question, context, currency) {
  const q = question.toLowerCase();
  const { income, expense, topCategories } = context;
  const matchedCategory = topCategories.find((c) =>
    categoryWords(c.name).some((word) => q.includes(word)),
  );
  if (matchedCategory) {
    return `You've spent ${money(matchedCategory.total, currency)} on ${matchedCategory.name} this month across ${matchedCategory.count} transaction(s).`;
  }
  if (/(top|biggest|most|which categor|what categor)/.test(q)) {
    if (!topCategories.length)
      return "No expense categories recorded yet this month.";
    const list = topCategories
      .map((c) => `${c.name} (${money(c.total, currency)})`)
      .join(", ");
    return `Your top spending categories this month: ${list}.`;
  }
  if (/(save|net|left over|left-over|surplus)/.test(q)) {
    const net = income - expense;
    return net >= 0
      ? `You're net positive by ${money(net, currency)} this month (${money(income, currency)} in, ${money(expense, currency)} out).`
      : `You're ${money(Math.abs(net), currency)} in the red this month (${money(income, currency)} in, ${money(expense, currency)} out).`;
  }
  if (/(income|earn|made)/.test(q)) {
    return `You've earned ${money(income, currency)} so far this month.`;
  }
  if (/(spend|spent|expense|cost)/.test(q)) {
    return `You've spent ${money(expense, currency)} so far this month${topCategories.length ? `, mostly on ${topCategories[0].name} (${money(topCategories[0].total, currency)})` : ""}.`;
  }
  return "I can answer basic questions about this month's income, expenses, and top categories without an AI key configured. For open-ended questions, add an OPENAI_API_KEY or ANTHROPIC_API_KEY to the server's .env.";
}
