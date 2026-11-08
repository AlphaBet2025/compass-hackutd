// "Toyota next move": compares the car-loan rate to the credit-card APR and
// picks one clear next step. Also holds the offline answers the coach uses
// if the Gemini API is unavailable.

import { runForecast } from "./forecast.js";
import { getHealth, money } from "./health.js";

// How many months and how much interest to pay off a balance at a fixed payment.
function payoff(balance, apr, payment) {
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.5 && months < 600) {
    const i = (b * apr) / 1200;
    if (payment <= i) return { months: Infinity, interest: Infinity };
    interest += i;
    b = b + i - Math.min(payment, b + i);
    months++;
  }
  return { months, interest };
}

export function getNextMove(c) {
  const card = c.accounts.creditCard;
  const loan = c.accounts.autoLoan;
  const spread = card.apr - loan.apr;
  const surplus = runForecast(c).monthlySurplus;

  // Put about 60% of the monthly leftover toward the target, rounded to $25.
  const extra = Math.max(0, Math.min(Math.floor((surplus * 0.6) / 25) * 25, Math.ceil(card.balance / 25) * 25));
  const cardFirst = spread > 3 && card.balance > 0 && extra > 0;

  const slow = payoff(card.balance, card.apr, card.monthlyPayment);
  const fast = payoff(card.balance, card.apr, card.monthlyPayment + extra);
  const interestSaved = Number.isFinite(slow.interest) ? Math.round(slow.interest - fast.interest) : null;

  if (cardFirst) {
    return {
      cardFirst,
      cardApr: card.apr,
      loanApr: loan.apr,
      spread,
      extra,
      payoffMonths: fast.months,
      slowMonths: slow.months,
      interestSaved,
      headline: `Pay your credit card first, not your Toyota.`,
      why: `Your card costs ${card.apr}% a year, almost ${(card.apr / loan.apr).toFixed(0)}× your ${loan.apr}% car loan. Every extra dollar on the card saves far more than the same dollar on the car.`,
      steps: [
        `Add ${money(extra)} a month to your card payment (${money(card.monthlyPayment + extra)} total).`,
        `Keep paying the usual ${money(loan.monthlyPayment)} on your ${loan.vehicle}. ${loan.apr}% is cheap debt, so don't rush it.`,
        `When the card hits $0 (about ${fast.months} months), send that ${money(card.monthlyPayment + extra)} to your Toyota loan or savings.`,
      ],
    };
  }

  return {
    cardFirst,
    cardApr: card.apr,
    loanApr: loan.apr,
    spread,
    extra: 0,
    payoffMonths: 0,
    interestSaved: null,
    headline: "Keep going. Put extra money toward your Toyota loan.",
    why: `Your card isn't costing you much more than the car loan, so the best next step is to shorten the loan.`,
    steps: [`Add a little extra to your ${money(loan.monthlyPayment)} car payment each month.`],
  };
}

// Friendly answers when Gemini can't be reached. Uses the same real numbers.
export function offlineAnswer(question, c, adjust) {
  const q = question.toLowerCase();
  const move = getNextMove(c);
  const health = getHealth(c);
  const weakest = [...health.indicators].sort((a, b) => a.score - b.score)[0];
  const a = c.accounts;

  if (/card|car|loan|toyota|first|pay off|debt/.test(q)) {
    return move.cardFirst
      ? `Pay the credit card first. It charges ${move.cardApr}% a year versus ${move.loanApr}% on your Toyota loan. Adding ${money(move.extra)} a month clears the card in about ${move.payoffMonths} months${move.interestSaved ? " and saves roughly " + money(move.interestSaved) + " in total interest (vs. " + move.slowMonths + " months at your usual payment)" : ""}. Keep making the normal ${money(a.autoLoan.monthlyPayment)} Toyota payment meanwhile.`
      : `Your debts cost about the same, so put extra toward the Toyota loan.`;
  }
  if (/score|health|how am i|doing/.test(q)) {
    return `Your health score is ${health.score}/100 (${health.label}). The weakest spot is your ${weakest.label.toLowerCase()} at ${weakest.display}. ${weakest.explain}`;
  }
  if (/emergency|cushion|save|saving/.test(q)) {
    return `Your checking and savings cover about ${health.metrics.cushion.toFixed(1)} months of expenses. The usual goal is 3 to 6 months. You keep around ${money(Math.max(runForecast(c, adjust).monthlySurplus, 0))} a month, so you're building it steadily.`;
  }
  if (/dining|eat|food|restaurant/.test(q)) {
    return `You spend ${money(c.monthlySpending.dining)} a month on dining. Cutting it in half frees about ${money(c.monthlySpending.dining / 2)} a month. Try the "Cut dining out" slider to see the effect.`;
  }
  return `Here's the big picture: your health score is ${health.score}/100, and your best next move is: ${move.headline} Ask me about your card, your Toyota loan, or your savings.`;
}

// Offline version of the coach's "Apply this plan" button.
export function offlinePlan(question, c) {
  const q = question.toLowerCase();
  const move = getNextMove(c);
  if (/card|car|loan|toyota|first|pay off|debt|faster/.test(q) && move.cardFirst) {
    return { diningCut: 0, extraCard: move.extra, incomeChange: 0, summary: `Add ${money(move.extra)}/month to the credit card` };
  }
  if (/dining|eat|spend|cut|save|saving|emergency/.test(q)) {
    return { diningCut: 50, extraCard: 0, incomeChange: 0, summary: "Cut dining out by 50%" };
  }
  return null;
}
