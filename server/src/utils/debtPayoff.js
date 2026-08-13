const MAX_MONTHS = 1200;
export function computePayoffPlan(
  debts,
  { strategy = "avalanche", extraMonthlyPayment = 0 } = {},
) {
  if (debts.length === 0) {
    return {
      months: 0,
      totalInterestPaid: 0,
      payoffDate: null,
      neverPaidOff: false,
      perDebt: [],
    };
  }
  const working = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    apr: d.apr,
    minimumPayment: d.minimumPayment,
    interestPaid: 0,
    monthsToPayoff: null,
  }));
  const priorityOrder = [...working].sort((a, b) =>
    strategy === "snowball" ? a.balance - b.balance : b.apr - a.apr,
  );
  const monthlyBudget =
    working.reduce((sum, d) => sum + d.minimumPayment, 0) + extraMonthlyPayment;
  let month = 0;
  let totalInterestPaid = 0;
  let neverPaidOff = false;
  while (working.some((d) => d.balance > 0)) {
    month += 1;
    if (month > MAX_MONTHS) {
      neverPaidOff = true;
      break;
    }
    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = Math.round(d.balance * (d.apr / 100 / 12));
      d.balance += interest;
      d.interestPaid += interest;
      totalInterestPaid += interest;
    }
    let spent = 0;
    for (const d of working) {
      if (d.balance <= 0) continue;
      const payment = Math.min(d.minimumPayment, d.balance);
      d.balance -= payment;
      spent += payment;
    }
    let remainingBudget = monthlyBudget - spent;
    for (const d of priorityOrder) {
      if (remainingBudget <= 0) break;
      if (d.balance <= 0) continue;
      const payment = Math.min(remainingBudget, d.balance);
      d.balance -= payment;
      remainingBudget -= payment;
    }
    for (const d of working) {
      if (d.balance <= 0 && d.monthsToPayoff === null) {
        d.balance = 0;
        d.monthsToPayoff = month;
      }
    }
    if (
      spent === 0 &&
      remainingBudget === monthlyBudget &&
      monthlyBudget === 0
    ) {
      neverPaidOff = true;
      break;
    }
  }
  const payoffDate = neverPaidOff
    ? null
    : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + month);
        return d;
      })();
  return {
    months: neverPaidOff ? null : month,
    totalInterestPaid,
    payoffDate,
    neverPaidOff,
    perDebt: working.map((d) => ({
      id: d.id,
      name: d.name,
      interestPaid: d.interestPaid,
      monthsToPayoff: d.monthsToPayoff,
    })),
  };
}
