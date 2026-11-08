// "Toyota next move": looks at the customer's debts, savings cushion and leftover
// cash and picks ONE clear next step. Four possible answers:
//   card-first    expensive card debt  -> pay the card before the Toyota loan
//   cushion-first thin safety net      -> build savings before prepaying debt
//   loan-first    expensive Toyota loan -> pay extra on the car loan
//   on-track      cheap debt, healthy savings -> don't prepay, invest instead
// Also holds the offline answers the coach uses if Gemini is unavailable.

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

const roundTo25 = (n) => Math.floor(n / 25) * 25;

export function getNextMove(c) {
  const card = c.accounts.creditCard;
  const loan = c.accounts.autoLoan;
  const sav = c.accounts.savings;
  const spread = card.apr - loan.apr;
  const surplus = runForecast(c).monthlySurplus;
  const health = getHealth(c);
  const cushion = health.metrics.cushion;
  const room = Math.max(0, roundTo25(surplus * 0.6)); // use about 60% of the monthly leftover

  const base = {
    cardApr: card.apr,
    loanApr: loan.apr,
    spread,
    extra: 0,
    payoffMonths: 0,
    slowMonths: 0,
    interestSaved: null,
    apply: null, // slider changes the "Try it" button makes
  };
  const saved = (slow, fast) => (Number.isFinite(slow.interest) ? Math.round(slow.interest - fast.interest) : null);

  // 1. Expensive credit-card debt
  const cardExtra = Math.min(room, Math.ceil(card.balance / 25) * 25);
  if (card.balance > 0 && spread > 3 && cardExtra > 0) {
    const slow = payoff(card.balance, card.apr, card.monthlyPayment);
    const fast = payoff(card.balance, card.apr, card.monthlyPayment + cardExtra);
    return {
      ...base,
      kind: "card-first",
      cardFirst: true,
      extra: cardExtra,
      payoffMonths: fast.months,
      slowMonths: slow.months,
      interestSaved: saved(slow, fast),
      apply: { extraCard: cardExtra },
      rates: [
        { label: "Credit card", pct: card.apr, tone: "hot" },
        { label: "Toyota auto loan", pct: loan.apr, tone: "cool" },
      ],
      rateNote: `${spread.toFixed(1)} points more expensive`,
      headline: "Pay your credit card first, not your Toyota.",
      why: `Your card costs ${card.apr}% a year, almost ${(card.apr / loan.apr).toFixed(0)}× your ${loan.apr}% car loan. Every extra dollar on the card saves far more than the same dollar on the car.`,
      insight: `your credit card costs **${card.apr}%** a year, almost ${(card.apr / loan.apr).toFixed(0)}× your Toyota loan. Paying it down first could save about **${money(saved(slow, fast) ?? 0)}** in interest.`,
      steps: [
        `Add ${money(cardExtra)} a month to your card payment (${money(card.monthlyPayment + cardExtra)} total).`,
        `Keep paying the usual ${money(loan.monthlyPayment)} on your ${loan.vehicle}. ${loan.apr}% is cheap debt, so don't rush it.`,
        `When the card hits $0 (about ${fast.months} months), send that ${money(card.monthlyPayment + cardExtra)} to your Toyota loan or savings.`,
      ],
    };
  }

  // 2. Thin safety net: build savings before prepaying any debt
  if (cushion < 3 && room > 0) {
    const need = Math.max(0, 3 * health.metrics.monthlyOutflow - (c.accounts.checking.balance + sav.balance));
    const months = Math.ceil(need / room);
    return {
      ...base,
      kind: "cushion-first",
      cardFirst: false,
      extra: room,
      payoffMonths: months,
      rates: [
        { label: "Your savings earn", pct: sav.apy, tone: "cool" },
        { label: "Toyota auto loan costs", pct: loan.apr, tone: "hot" },
      ],
      rateNote: "Safety first, then debt",
      headline: "Build your safety net before paying extra on debt.",
      why: `You have about ${cushion.toFixed(1)} months of cushion. A surprise bill could force you onto a credit card, so cover 3 months first.`,
      insight: `you only have about **${cushion.toFixed(1)} months** of savings cushion. Build it to 3 months before prepaying debt.`,
      steps: [
        `Save about ${money(room)} a month, taken from your monthly leftover.`,
        `You'd reach a 3-month cushion in about ${months} months.`,
        `Keep making the normal ${money(loan.monthlyPayment)} Toyota payment meanwhile. Then attack the loan.`,
      ],
    };
  }

  // 3. Expensive Toyota loan: pay extra on the car
  const loanExtra = Math.min(room, Math.ceil(loan.balance / 25) * 25);
  if (loan.balance > 0 && loan.apr >= 8 && loanExtra > 0) {
    const slow = payoff(loan.balance, loan.apr, loan.monthlyPayment);
    const fast = payoff(loan.balance, loan.apr, loan.monthlyPayment + loanExtra);
    return {
      ...base,
      kind: "loan-first",
      cardFirst: false,
      extra: loanExtra,
      payoffMonths: fast.months,
      slowMonths: slow.months,
      interestSaved: saved(slow, fast),
      apply: { extraLoan: loanExtra },
      rates: [
        { label: "Toyota auto loan", pct: loan.apr, tone: "hot" },
        { label: "Your savings earn", pct: sav.apy, tone: "cool" },
      ],
      rateNote: `You pay ${(loan.apr - sav.apy).toFixed(1)} points more than you earn`,
      headline: "Pay extra on your Toyota loan.",
      why: `Your ${loan.vehicle} loan costs ${loan.apr}% a year, much more than the ${sav.apy}% your savings earn. Paying it down faster is a sure return.`,
      insight: `your Toyota loan costs **${loan.apr}%** a year, but savings only earn ${sav.apy}%. Paying it down faster could save about **${money(saved(slow, fast) ?? 0)}** in interest.`,
      steps: [
        `Add ${money(loanExtra)} a month to your car payment (${money(loan.monthlyPayment + loanExtra)} total).`,
        `That clears the loan in about ${fast.months} months instead of ${slow.months}.`,
        `Then send that ${money(loan.monthlyPayment + loanExtra)} a month to savings and retirement.`,
      ],
    };
  }

  // 4. Cheap debt and a healthy cushion: don't prepay
  return {
    ...base,
    kind: "on-track",
    cardFirst: false,
    extra: room,
    rates: [
      { label: "Toyota auto loan costs", pct: loan.apr, tone: "cool" },
      { label: "Retirement (assumed growth)", pct: 7, tone: "cool" },
    ],
    rateNote: "Cheap debt: no need to rush",
    headline: "You're in good shape. Don't rush the Toyota loan.",
    why: `Your ${loan.apr}% car loan is cheap, and you have ${cushion.toFixed(1)} months of cushion. Extra cash does more in retirement and savings than in prepaying this loan.`,
    insight: `you're in good shape. Your Toyota loan costs only **${loan.apr}%** and you have **${cushion.toFixed(1)} months** of cushion, so put extra money to work in retirement savings.`,
    steps: [
      `Keep paying the normal ${money(loan.monthlyPayment)} on your ${loan.vehicle}.`,
      `Move about ${money(room)} a month of your leftover cash into your retirement account.`,
      `Check back each year: if your loan rate or savings change, Compass will adjust the advice.`,
    ],
  };
}

// The app's own recommended plan (the Toyota "next move"), in the same shape the coach uses.
// It's null when the right answer is NOT to pay anything extra (for example, a cheap loan).
export function movePlan(c) {
  const move = getNextMove(c);
  if (!move.apply) return null;
  const where = Object.keys(move.apply)[0] === "extraCard" ? "credit card" : "Toyota loan";
  return { ...move.apply, summary: `Add ${money(move.extra)}/month to the ${where}` };
}

// "Can you help me apply it?", "do it", "go ahead"…
export const asksToApply = (q) => /\b(apply|do it|set it|set that|put it in|go ahead|make it happen|help me)\b/i.test(q);

// Friendly answers when Gemini can't be reached. Uses the same real numbers.
export function offlineAnswer(question, c, adjust) {
  const q = question.toLowerCase();
  const move = getNextMove(c);

  if (asksToApply(q)) {
    const p = movePlan(c);
    return p
      ? `Here's the plan: **${p.summary}**. Tap **Apply this plan** below and I'll set the sliders so you can see the forecast change.`
      : `There's nothing extra to apply right now. ${move.headline} ${move.why}`;
  }
  const health = getHealth(c);
  const weakest = [...health.indicators].sort((a, b) => a.score - b.score)[0];
  const a = c.accounts;

  if (/card|car|loan|toyota|first|pay off|debt/.test(q)) {
    if (move.kind === "card-first") {
      return `Pay the credit card first. It charges ${move.cardApr}% a year versus ${move.loanApr}% on your Toyota loan. Adding ${money(move.extra)} a month clears the card in about ${move.payoffMonths} months${move.interestSaved ? " and saves roughly " + money(move.interestSaved) + " in total interest (vs. " + move.slowMonths + " months at your usual payment)" : ""}. Keep making the normal ${money(a.autoLoan.monthlyPayment)} Toyota payment meanwhile.`;
    }
    return `${move.headline} ${move.why}`;
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
  return `Here's the big picture: your health score is ${health.score}/100, and your best next move is: ${move.headline} Ask me about your debts, your Toyota loan, or your savings.`;
}

// Offline version of the coach's "Apply this plan" button.
export function offlinePlan(question, c) {
  const q = question.toLowerCase();
  const move = getNextMove(c);
  if ((asksToApply(q) || /card|car|loan|toyota|first|pay off|debt|faster/.test(q)) && move.apply) {
    return movePlan(c);
  }
  if (/dining|eat|spend|cut|save|saving|emergency/.test(q)) {
    return { diningCut: 50, summary: "Cut dining out by 50%" };
  }
  return null;
}
