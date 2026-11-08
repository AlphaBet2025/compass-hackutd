// One-time setup: creates Jordan Rivera's accounts, loan, bills AND a month of
// spending (purchases) inside YOUR Nessie sandbox, so the app has real data
// to read when USE_NESSIE=true.
//
//   npm run seed:nessie            create everything (stops if data already exists)
//   npm run seed:nessie -- --reset wipe your Nessie sandbox first, then create everything
//
// ✋ YOUR TURN: the PURCHASES list below is Jordan's spending. Change merchants
// or amounts, reseed with --reset, and the dining slider + coach follow.

import "dotenv/config";
import { nessieFetch } from "./nessie.js";
import { customer as c } from "../src/data/customer.js";

const cents = (d) => Math.round(d * 100);
const a = c.accounts;

// [merchant, Nessie category, amount in dollars]. Totals match the demo profile:
// groceries $450, dining $380, transport $300, shopping/other $300.
const PURCHASES = [
  ["H-E-B", "Grocery", 112.4], ["Trader Joe's", "Grocery", 96.25], ["Costco", "Grocery", 141.1], ["Whole Foods", "Grocery", 100.25],
  ["Chipotle", "Dining", 46.2], ["Torchy's Tacos", "Dining", 58.75], ["Cava", "Dining", 52.1], ["Starbucks", "Dining", 31.45],
  ["Whataburger", "Dining", 27.8], ["Local Thai Kitchen", "Dining", 88.4], ["Starbucks", "Dining", 34.3], ["Uber Eats", "Dining", 41.0],
  ["Shell", "Transport", 58.2], ["Shell", "Transport", 61.35], ["Uber", "Transport", 24.5], ["DART Transit", "Transport", 96.0], ["GEICO Auto Insurance", "Transport", 59.95],
  ["Amazon", "Shopping", 84.99], ["Target", "Shopping", 67.45], ["AMC Theatres", "Entertainment", 38.0], ["CVS Pharmacy", "Health", 42.3], ["Gap", "Shopping", 67.26],
];
const spendTotal = PURCHASES.reduce((s, p) => s + p[2], 0);

if (process.argv.includes("--reset")) {
  const r = await nessieFetch("/data", { method: "DELETE" });
  console.log("Wiped your Nessie sandbox:", JSON.stringify(r));
}

const existing = await nessieFetch("/accounts?limit=1");
if ((existing.items || []).length > 0) {
  console.log("Your Nessie account already has accounts. Nothing changed. (Use: npm run seed:nessie -- --reset)");
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

// Purchases lower the balance once they settle (~10 seconds), so checking starts
// higher by exactly the amount we're about to spend. It ends at the demo balance.
const checking = await makeAccount({ type: "Checking", nickname: "Everyday Checking", balance_cents: cents(a.checking.balance + spendTotal) });
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

// Spending: one merchant per name, then a purchase for each line.
const merchants = new Map();
for (const [name, category, amount] of PURCHASES) {
  if (!merchants.has(name)) merchants.set(name, (await nessieFetch("/merchants", { method: "POST", body: { name, category } })).id);
  await nessieFetch(`/accounts/${checking.id}/purchases`, {
    method: "POST",
    body: { merchant_id: merchants.get(name), amount_cents: cents(amount), description: `${name} (${category})` },
  });
  await new Promise((r) => setTimeout(r, 700)); // be gentle: Nessie rate-limits bursts
}
console.log(`  spending: ${PURCHASES.length} purchases, $${spendTotal.toFixed(2)} total`);

// Wait for purchases to settle, then confirm checking landed on the demo balance.
console.log("Waiting for purchases to settle…");
await new Promise((r) => setTimeout(r, 22_000));
const final = await nessieFetch(`/accounts/${checking.id}`);
console.log(`Checking balance: $${final.balance_cents / 100} (expected $${a.checking.balance})`);

console.log("\nDone. Make sure USE_NESSIE=true in .env, then restart npm run dev.");
