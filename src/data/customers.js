// ✋ YOUR TURN: the three sample customers. Change names, numbers or the one-line
// stories. Each person is built to get DIFFERENT advice from Compass:
//   Jordan: card debt at ~25%        -> "pay the card first"
//   Maya:   expensive Toyota loan    -> "attack the car loan"
//   Dev:    strong saver, cheap loan -> "don't prepay it, invest instead"
// (All three are made up.)

import { customer as jordan } from "./customer.js";

const maya = {
  name: "Maya Chen",
  age: 24,
  monthlyGrossIncome: 4200,
  monthlyNetIncome: 3400,
  accounts: {
    checking: { id: "checking", label: "Checking", balance: 2600 },
    savings: { id: "savings", label: "Savings", balance: 6400, apy: 4.1 },
    cd: { id: "cd", label: "Certificate of Deposit", balance: 1000, apy: 4.5, term: "6-mo CD" },
    ira: { id: "ira", label: "Roth IRA", balance: 2100 },
    creditCard: { id: "creditCard", label: "Credit Card", balance: 0, limit: 3000, apr: 22.9, monthlyPayment: 0 },
    autoLoan: { id: "autoLoan", label: "Toyota Auto Loan", balance: 11800, apr: 11.4, monthlyPayment: 340, vehicle: "2019 Toyota Corolla" },
  },
  monthlySpending: { rent: 1250, groceries: 300, dining: 280, transport: 220, utilities: 130, subscriptions: 70, other: 200 },
};

const dev = {
  name: "Dev Patel",
  age: 35,
  monthlyGrossIncome: 9500,
  monthlyNetIncome: 7200,
  accounts: {
    checking: { id: "checking", label: "Checking", balance: 6000 },
    savings: { id: "savings", label: "Savings", balance: 28000, apy: 4.1 },
    cd: { id: "cd", label: "Certificate of Deposit", balance: 15000, apy: 4.5, term: "12-mo CD" },
    ira: { id: "ira", label: "Roth IRA", balance: 96000 },
    creditCard: { id: "creditCard", label: "Credit Card", balance: 0, limit: 15000, apr: 18.9, monthlyPayment: 0 },
    autoLoan: { id: "autoLoan", label: "Toyota Auto Loan", balance: 8400, apr: 2.9, monthlyPayment: 450, vehicle: "2023 Toyota Tacoma" },
  },
  monthlySpending: { rent: 2000, groceries: 600, dining: 450, transport: 350, utilities: 220, subscriptions: 120, other: 500 },
};

export const people = [
  { id: "jordan", tagline: "Card debt at 25%", data: jordan },
  { id: "maya", tagline: "Expensive car loan", data: maya },
  { id: "dev", tagline: "Strong saver, cheap loan", data: dev },
];

export const getPerson = (id) => people.find((p) => p.id === id) || people[0];
