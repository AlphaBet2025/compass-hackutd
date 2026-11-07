// All the money math lives here, so the screen, the simulator and the AI coach
// always agree on the same numbers.

const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function getTotals(c) {
  const a = c.accounts;
  const assets = a.checking.balance + a.savings.balance + a.cd.balance + a.ira.balance;
  const debts = a.creditCard.balance + a.autoLoan.balance;
  return { assets, debts, netWorth: assets - debts };
}

// Turns a raw value into a 0-100 score using two cutoffs:
// "poor" (score 0) and "great" (score 100), with a straight line between.
function scale(value, poor, great) {
  return clamp(((value - poor) / (great - poor)) * 100);
}

function status(score) {
  if (score >= 75) return "good";
  if (score >= 45) return "ok";
  return "risky";
}

export function getHealth(c) {
  const a = c.accounts;
  const debtPayments = a.creditCard.monthlyPayment + a.autoLoan.monthlyPayment;
  const monthlyOutflow = sum(c.monthlySpending) + debtPayments;

  // 1. Emergency fund: months of expenses covered by checking + savings
  const cushion = (a.checking.balance + a.savings.balance) / monthlyOutflow;
  // 2. Credit utilization: how much of the card limit is used
  const utilization = (a.creditCard.balance / a.creditCard.limit) * 100;
  // 3. Debt-to-income: rent + debt payments vs gross income
  const dti = ((c.monthlySpending.rent + debtPayments) / c.monthlyGrossIncome) * 100;
  // 4. Savings rate: share of take-home pay left over each month
  const savingsRate = ((c.monthlyNetIncome - monthlyOutflow) / c.monthlyNetIncome) * 100;

  const indicators = [
    {
      id: "emergency",
      label: "Emergency fund",
      display: `${cushion.toFixed(1)} months`,
      score: scale(cushion, 0, 6),
      target: "Goal: 6 months",
      explain: "How long your checking and savings could cover your bills if income stopped.",
    },
    {
      id: "utilization",
      label: "Credit utilization",
      display: `${utilization.toFixed(0)}%`,
      score: scale(utilization, 70, 10),
      target: "Goal: under 30%",
      explain: "How much of your credit card limit you're using. Lower helps your credit score.",
    },
    {
      id: "dti",
      label: "Debt-to-income",
      display: `${dti.toFixed(0)}%`,
      score: scale(dti, 50, 20),
      target: "Goal: under 36%",
      explain: "Share of your pre-tax income that goes to rent and debt payments each month.",
    },
    {
      id: "savings",
      label: "Savings rate",
      display: `${savingsRate.toFixed(0)}%`,
      score: scale(savingsRate, 0, 20),
      target: "Goal: 20%+",
      explain: "Share of your take-home pay you keep each month after all spending and payments.",
    },
  ].map((i) => ({ ...i, score: Math.round(i.score), status: status(i.score) }));

  const score = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
  const label = score >= 75 ? "Strong" : score >= 55 ? "Getting there" : score >= 35 ? "Needs attention" : "At risk";

  return { score, label, indicators, metrics: { cushion, utilization, dti, savingsRate, monthlyOutflow } };
}

export const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
