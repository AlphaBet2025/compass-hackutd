// Stress test: "What if my income stopped today?" How many months could
// Jordan keep going on savings alone?

const ESSENTIALS = ["rent", "groceries", "utilities", "transport"];
const GOAL_MONTHS = 6;

export function getRunway(c) {
  const a = c.accounts;
  const debtPayments = a.creditCard.monthlyPayment + a.autoLoan.monthlyPayment;
  const spending = c.monthlySpending;

  const allSpending = Object.values(spending).reduce((s, n) => s + n, 0);
  const essentials = ESSENTIALS.reduce((s, k) => s + (spending[k] || 0), 0);

  const liquid = a.checking.balance + a.savings.balance; // money you can reach instantly
  const withCd = liquid + a.cd.balance; // if you also break the CD (an early-withdrawal penalty may apply)

  const nowOutflow = allSpending + debtPayments;
  const leanOutflow = essentials + debtPayments;

  return {
    liquid,
    goalMonths: GOAL_MONTHS,
    nowOutflow,
    leanOutflow,
    nowMonths: liquid / nowOutflow,
    leanMonths: liquid / leanOutflow,
    cdMonths: withCd / leanOutflow,
    // How much more cash it would take to cover 6 months of lean living
    gapToGoal: Math.max(0, GOAL_MONTHS * leanOutflow - liquid),
  };
}
