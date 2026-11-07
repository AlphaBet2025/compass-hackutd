// Turns Jordan's real numbers into plain text for Gemini to read.
import { money, getTotals } from "./health.js";
import { getNextMove } from "./nextMove.js";

export function buildCoachContext(c, health, scenario, adjust) {
  const a = c.accounts;
  const t = getTotals(c);
  const move = getNextMove(c);
  const changed = adjust.diningCut || adjust.extraCard || adjust.incomeChange;

  return `
CUSTOMER: ${c.name}, age ${c.age}
Take-home income: ${money(c.monthlyNetIncome)}/month (gross ${money(c.monthlyGrossIncome)})
Net worth: ${money(t.netWorth)} (assets ${money(t.assets)}, debt ${money(t.debts)})

ACCOUNTS
- Checking: ${money(a.checking.balance)}
- Savings: ${money(a.savings.balance)} at ${a.savings.apy}% APY
- CD: ${money(a.cd.balance)} at ${a.cd.apy}% APY
- Roth IRA: ${money(a.ira.balance)}
- Credit card: owes ${money(a.creditCard.balance)} of ${money(a.creditCard.limit)} limit, ${a.creditCard.apr}% APR, pays ${money(a.creditCard.monthlyPayment)}/month
- Toyota auto loan (${a.autoLoan.vehicle}): owes ${money(a.autoLoan.balance)}, ${a.autoLoan.apr}% APR, pays ${money(a.autoLoan.monthlyPayment)}/month

MONTHLY SPENDING (excluding debt payments)
${Object.entries(c.monthlySpending).map(([k, v]) => `- ${k}: ${money(v)}`).join("\n")}

FINANCIAL HEALTH SCORE TODAY: ${health.score}/100 (${health.label})
${health.indicators.map((i) => `- ${i.label}: ${i.display} (${i.score}/100, ${i.target})`).join("\n")}

COMPASS'S TOYOTA NEXT MOVE: ${move.headline} ${move.why}${move.cardFirst ? ` Suggested: extra ${money(move.extra)}/month on the card, paid off in ~${move.payoffMonths} months, saving ~${money(move.interestSaved ?? 0)} interest.` : ""}

12-MONTH FORECAST (no changes): net worth ${money(scenario.baselineEnd.netWorth)}, debt ${money(scenario.baselineEnd.debt)}
${changed ? `USER IS CURRENTLY TRYING A WHAT-IF: cut dining ${adjust.diningCut}%, extra card payment ${money(adjust.extraCard)}/month, income change ${adjust.incomeChange}%. Result: net worth ${money(scenario.end.netWorth)}, debt ${money(scenario.end.debt)}, projected score ${scenario.health.score}.` : "No what-if scenario is active."}
`.trim();
}
