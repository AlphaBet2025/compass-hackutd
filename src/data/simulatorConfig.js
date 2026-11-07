// ✋ YOUR TURN: this file controls the what-if sliders. Change anything here
// and the sliders update. Ideas:
//   - change the min / max / step of a slider
//   - rename a slider ("label") or reword its hint ("hint") in your own voice
//   - add a new slider (it also needs a line in src/lib/forecast.js to do anything)

export const SLIDERS = [
  {
    key: "diningCut",
    label: "Cut dining out",
    min: 0,
    max: 100,
    step: 5,
    hint: "Eat out less, cook more.",
  },
  {
    key: "extraCard",
    label: "Extra credit-card payment",
    min: 0,
    max: 1000,
    step: 25,
    hint: "On top of your usual payment, every month.",
  },
  {
    key: "incomeChange",
    label: "Income change",
    min: -30,
    max: 30,
    step: 1,
    hint: "A raise, a side gig, or a pay cut.",
  },
];
