// One-time setup: creates Jordan Rivera's accounts, loan and bills inside YOUR
// Nessie sandbox, so the app has something to read when USE_NESSIE=true.
// Run:  npm run seed:nessie
// Safe: it stops if your Nessie account already has accounts.

import "dotenv/config";
import { nessieFetch } from "./nessie.js";
import { customer as c } from "../src/data/customer.js";

const cents = (d) => Math.round(d * 100);
const a = c.accounts;

const existing = await nessieFetch("/accounts?limit=1");
if ((existing.items || []).length > 0) {
  console.log("Your Nessie account already has accounts. Nothing changed.");
  process.exit(0);
}

const [first, last] = c.name.split(" ");
const cust = await nessieFetch("/customers", {
  method: "POST",
  body: { first_name: first, last_name: last, address: { street_number: "2800", street_name: "Waterview Pkwy", city: "Richardson", state: "TX", zip: "75080" } },
});
console.log("Created customer", cust.id);

async function makeAccount(body) {
  const r = await nessieFetch(`/customers/${cust.id}/accounts`, { method: "POST", body });
  console.log("  account:", body.nickname);
  return r;
}

const checking = await makeAccount({ type: "Checking", nickname: "Everyday Checking", balance_cents: cents(a.checking.balance) });
await makeAccount({ type: "Savings", nickname: `High-yield Savings · ${a.savings.apy}% APY`, balance_cents: cents(a.savings.balance) });
await makeAccount({ type: "Savings", nickname: `12-mo CD · ${a.cd.apy}% APY`, balance_cents: cents(a.cd.balance) });
await makeAccount({ type: "Savings", nickname: "Roth IRA", balance_cents: cents(a.ira.balance) });
await makeAccount({
  type: "Credit Card",
  nickname: `Rivera Rewards Visa · ${a.creditCard.apr}% APR`,
  balance_cents: cents(a.creditCard.balance),
  credit_limit_cents: cents(a.creditCard.limit),
});

await nessieFetch(`/accounts/${checking.id}/loans`, {
  method: "POST",
  body: {
    type: "auto",
    status: "active",
    credit_score: 710,
    monthly_payment_cents: cents(a.autoLoan.monthlyPayment),
    amount_cents: cents(a.autoLoan.balance),
    description: `${a.autoLoan.vehicle} · ${a.autoLoan.apr}% APR`,
  },
});
console.log("  loan:", a.autoLoan.vehicle);

const bills = [
  ["Rent", "Lakeside Apartments", c.monthlySpending.rent, 1],
  ["Utilities", "City Power & Water", c.monthlySpending.utilities, 8],
  ["Subscriptions", "Streaming & apps", c.monthlySpending.subscriptions, 15],
];
for (const [nickname, payee, amount, day] of bills) {
  await nessieFetch(`/accounts/${checking.id}/bills`, {
    method: "POST",
    body: { nickname, payee, payment_amount: amount, status: "recurring", recurring_date: day },
  });
  console.log("  bill:", nickname);
}

console.log("\nDone. Now set USE_NESSIE=true in .env and restart npm run dev.");
