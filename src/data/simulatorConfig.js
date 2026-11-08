// ✋ YOUR TURN: this file controls the what-if sliders. Change anything here
// and the sliders update. Ideas:
//   - change the min / max / step of a slider
//   - rename a slider ("label") or reword its hint ("hint") in your own voice
//
// "spendKey" links a slider to one of Jordan's spending lines.

export const SLIDERS = [
  { key: "diningCut", spendKey: "dining", label: "Cut dining out", min: 0, max: 100, step: 5, hint: "Eat out less, cook more." },
  { key: "groceriesCut", spendKey: "groceries", label: "Cut groceries", min: 0, max: 40, step: 5, hint: "Shop sales, buy less waste." },
  { key: "transportCut", spendKey: "transport", label: "Cut transport", min: 0, max: 40, step: 5, hint: "Fewer rideshares, carpool, cheaper insurance." },
  { key: "otherCut", spendKey: "other", label: "Cut shopping & other", min: 0, max: 100, step: 5, hint: "Fewer impulse buys." },
  { key: "extraCard", label: "Extra credit-card payment", min: 0, max: 1000, step: 25, hint: "On top of your usual payment, every month." },
  { key: "extraLoan", label: "Extra Toyota loan payment", min: 0, max: 1000, step: 25, hint: "On top of your usual car payment, every month." },
  { key: "incomeChange", label: "Income change", min: -30, max: 30, step: 1, hint: "A raise, a side gig, or a pay cut." },
];
