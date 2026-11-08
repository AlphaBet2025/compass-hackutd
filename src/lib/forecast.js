// 12-month forecast. Each month we: add interest, make debt payments,
// move leftover income into checking, and grow savings / CD / IRA.
// The "what if" sliders just feed different numbers into this same function.

import { getHealth } from "./health.js";

export const DEFAULT_ADJUST = {
  diningCut: 0,
  groceriesCut: 0,
  transportCut: 0,
  otherCut: 0,
  extraCard: 0,
  incomeChange: 0,
};

const IRA_GROWTH = 7; // assumed % per year for the Roth IRA (a rough guess)
const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

function monthLabel(offset) {
  if (offset === 0) return "Now";
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString("en-US", { month: "short" });
}

export function runForecast(c, adj = DEFAULT_ADJUST, months = 12) {
  const a = c.accounts;
  let checking = a.checking.balance;
  let savings = a.savings.balance;
  let cd = a.cd.balance;
  let ira = a.ira.balance;
  let card = a.creditCard.balance;
  let loan = a.autoLoan.balance;

  const net = c.monthlyNetIncome * (1 + adj.incomeChange / 100);
  const gross = c.monthlyGrossIncome * (1 + adj.incomeChange / 100);
  // Each "cut" slider lowers one spending line by that percent.
  const cut = { dining: adj.diningCut, groceries: adj.groceriesCut, transport: adj.transportCut, other: adj.otherCut };
  const adjustedSpending = Object.fromEntries(
    Object.entries(c.monthlySpending).map(([k, v]) => [k, v * (1 - (cut[k] || 0) / 100)])
  );
  const spending = sum(adjustedSpending);

  const snapshot = (i) => ({
    label: monthLabel(i),
    cash: Math.round(checking + savings + cd),
    debt: Math.round(card + loan),
    netWorth: Math.round(checking + savings + cd + ira - card - loan),
  });

  const points = [snapshot(0)];
  let overdrawn = false;

  for (let m = 1; m <= months; m++) {
    card += (card * a.creditCard.apr) / 1200;
    loan += (loan * a.autoLoan.apr) / 1200;

    const cardPay = Math.min(card, a.creditCard.monthlyPayment + adj.extraCard);
    const loanPay = Math.min(loan, a.autoLoan.monthlyPayment);
    card -= cardPay;
    loan -= loanPay;

    checking += net - spending - cardPay - loanPay;
    if (checking < 0) overdrawn = true;

    savings *= 1 + a.savings.apy / 1200;
    cd *= 1 + a.cd.apy / 1200;
    ira *= 1 + IRA_GROWTH / 1200;

    points.push(snapshot(m));
  }

  // What Jordan's finances look like at the end, so we can score it.
  const endCustomer = {
    ...c,
    monthlyNetIncome: net,
    monthlyGrossIncome: gross,
    monthlySpending: adjustedSpending,
    accounts: {
      ...a,
      checking: { ...a.checking, balance: Math.max(checking, 0) },
      savings: { ...a.savings, balance: savings },
      cd: { ...a.cd, balance: cd },
      ira: { ...a.ira, balance: ira },
      creditCard: {
        ...a.creditCard,
        balance: card,
        monthlyPayment: card > 0.5 ? a.creditCard.monthlyPayment + adj.extraCard : 0,
      },
      autoLoan: {
        ...a.autoLoan,
        balance: loan,
        monthlyPayment: loan > 0.5 ? a.autoLoan.monthlyPayment : 0,
      },
    },
  };

  return {
    points,
    end: points[points.length - 1],
    health: getHealth(endCustomer),
    monthlySurplus: net - spending - a.creditCard.monthlyPayment - adj.extraCard - a.autoLoan.monthlyPayment,
    overdrawn,
  };
}
