// Built-in synthetic customer (fake data). Later, Nessie can replace this.
// Balances: positive = money you have, debts are stored as positive "balance owed".

export const customer = {
  name: "Jordan Rivera",
  age: 28,
  monthlyGrossIncome: 5800, // before taxes
  monthlyNetIncome: 4600, // take-home

  accounts: {
    checking: { id: "checking", label: "Checking", balance: 3200 },
    savings: { id: "savings", label: "Savings", balance: 6500, apy: 4.1 },
    cd: { id: "cd", label: "Certificate of Deposit", balance: 5000, apy: 4.5, term: "12-mo CD" },
    ira: { id: "ira", label: "Roth IRA", balance: 11800 },
    creditCard: {
      id: "creditCard",
      label: "Credit Card",
      balance: 3400, // amount owed
      limit: 8000,
      apr: 24.99,
      monthlyPayment: 150,
    },
    autoLoan: {
      id: "autoLoan",
      label: "Toyota Auto Loan",
      balance: 14200, // amount owed
      apr: 6.4,
      monthlyPayment: 385,
      vehicle: "2022 Toyota RAV4",
    },
  },

  // Typical monthly spending (not counting debt payments)
  monthlySpending: {
    rent: 1500,
    groceries: 450,
    dining: 380,
    transport: 300,
    utilities: 180,
    subscriptions: 90,
    other: 300,
  },
};
