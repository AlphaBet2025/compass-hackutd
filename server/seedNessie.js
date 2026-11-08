// One-time setup: creates all three sample customers (Jordan, Maya, Dev) inside
// YOUR Nessie sandbox: accounts, Toyota loan, recurring bills and a month of
// purchases. Then the app can read each person live when USE_NESSIE=true.
//
//   npm run seed:nessie            create everything (stops if data already exists)
//   npm run seed:nessie -- --reset wipe your Nessie sandbox first, then create everything
//
// ✋ YOUR TURN: JORDAN_PURCHASES below is Jordan's spending, merchant by merchant.
// (Maya's and Dev's purchases are generated from the numbers in src/data/customers.js.)

import "dotenv/config";
import { nessieFetch } from "./nessie.js";
import { people } from "../src/data/customers.js";

const cents = (d) => Math.round(d * 100);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Nessie rate-limits bursts, so every write waits a moment.
async function write(path, body) {
  const r = await nessieFetch(path, { method: "POST", body });
  await pause(450);
  return r;
}

// [merchant, Nessie category, amount in dollars]. Totals match Jordan's profile:
// groceries $450, dining $380, transport $300, shopping/other $300.
const JORDAN_PURCHASES = [
  ["H-E-B", "Grocery", 112.4], ["Trader Joe's", "Grocery", 96.25], ["Costco", "Grocery", 141.1], ["Whole Foods", "Grocery", 100.25],
  ["Chipotle", "Dining", 46.2], ["Torchy's Tacos", "Dining", 58.75], ["Cava", "Dining", 52.1], ["Starbucks", "Dining", 31.45],
  ["Whataburger", "Dining", 27.8], ["Local Thai Kitchen", "Dining", 88.4], ["Starbucks", "Dining", 34.3], ["Uber Eats", "Dining", 41.0],
  ["Shell", "Transport", 58.2], ["Shell", "Transport", 61.35], ["Uber", "Transport", 24.5], ["DART Transit", "Transport", 96.0], ["GEICO Auto Insurance", "Transport", 59.95],
  ["Amazon", "Shopping", 84.99], ["Target", "Shopping", 67.45], ["AMC Theatres", "Entertainment", 38.0], ["CVS Pharmacy", "Health", 42.3], ["Gap", "Shopping", 67.26],
];

// For everyone else: split each spending line into a few purchases at plausible merchants.
const LINES = [
  ["groceries", "Grocery", ["Aldi", "H-E-B", "Trader Joe's", "Whole Foods"], 4],
  ["dining", "Dining", ["Chipotle", "Starbucks", "Local Thai Kitchen", "Cava", "Whataburger", "Uber Eats"], 6],
  ["transport", "Transport", ["Shell", "Uber", "DART Transit", "Exxon"], 4],
  ["other", "Shopping", ["Amazon", "Target", "AMC Theatres", "CVS Pharmacy"], 4],
];
function generatePurchases(spending) {
  const out = [];
  for (const [key, category, merchants, parts] of LINES) {
    const total = cents(spending[key] || 0);
    const weights = Array.from({ length: parts }, (_, i) => 1 + ((i * 7) % 5) / 5); // uneven but repeatable
    const sumW = weights.reduce((a, b) => a + b, 0);
    let left = total;
    weights.forEach((w, i) => {
      const part = i === parts - 1 ? left : Math.floor((total * w) / sumW);
      left -= part;
      out.push([merchants[i % merchants.length], category, part / 100]);
    });
  }
  return out;
}

const ADDRESSES = {
  jordan: { street_number: "2800", street_name: "Waterview Pkwy", city: "Richardson", state: "TX", zip: "75080" },
  maya: { street_number: "410", street_name: "Elm St", city: "Dallas", state: "TX", zip: "75202" },
  dev: { street_number: "1200", street_name: "Preston Rd", city: "Plano", state: "TX", zip: "75093" },
};

if (process.argv.includes("--reset")) {
  const r = await nessieFetch("/data", { method: "DELETE" });
  console.log("Wiped your Nessie sandbox:", JSON.stringify(r));
}

const existing = await nessieFetch("/accounts?limit=1");
if ((existing.items || []).length > 0) {
  console.log("Your Nessie account already has accounts. Nothing changed. (Use: npm run seed:nessie -- --reset)");
  process.exit(0);
}

const merchants = new Map(); // merchants are shared, so create each name once
const checkingAccounts = [];

for (const person of people) {
  const c = person.data;
  const a = c.accounts;
  const purchases = person.id === "jordan" ? JORDAN_PURCHASES : generatePurchases(c.monthlySpending);
  const spendTotal = purchases.reduce((s, p) => s + p[2], 0);

  console.log(`\n== ${c.name} ==`);
  const [first, ...rest] = c.name.split(" ");
  const cust = await write("/customers", { first_name: first, last_name: rest.join(" "), address: ADDRESSES[person.id] });

  const makeAccount = async (body) => {
    const r = await write(`/customers/${cust.id}/accounts`, body);
    console.log("  account:", body.nickname);
    return r;
  };

  // Purchases lower the balance once they settle (~10 seconds), so checking starts
  // higher by exactly what we're about to spend. It ends at the demo balance.
  const checking = await makeAccount({ type: "Checking", nickname: "Everyday Checking", balance_cents: cents(a.checking.balance + spendTotal) });
  checkingAccounts.push({ name: c.name, id: checking.id, expected: a.checking.balance });
  await makeAccount({ type: "Savings", nickname: `High-yield Savings · ${a.savings.apy}% APY`, balance_cents: cents(a.savings.balance) });
  await makeAccount({ type: "Savings", nickname: `${a.cd.term} · ${a.cd.apy}% APY`, balance_cents: cents(a.cd.balance) });
  await makeAccount({ type: "Savings", nickname: "Roth IRA", balance_cents: cents(a.ira.balance) });
  await makeAccount({
    type: "Credit Card",
    nickname: `${first}'s Rewards Visa · ${a.creditCard.apr}% APR`,
    balance_cents: cents(a.creditCard.balance),
    credit_limit_cents: cents(a.creditCard.limit),
  });

  await write(`/accounts/${checking.id}/loans`, {
    type: "auto",
    status: "active",
    credit_score: 710,
    monthly_payment_cents: cents(a.autoLoan.monthlyPayment),
    amount_cents: cents(a.autoLoan.balance),
    description: `${a.autoLoan.vehicle} · ${a.autoLoan.apr}% APR`,
  });
  console.log("  loan:", a.autoLoan.vehicle);

  const bills = [
    ["Rent", "Landlord", c.monthlySpending.rent, 1],
    ["Utilities", "City Power & Water", c.monthlySpending.utilities, 8],
    ["Subscriptions", "Streaming & apps", c.monthlySpending.subscriptions, 15],
  ];
  for (const [nickname, payee, amount, day] of bills) {
    await write(`/accounts/${checking.id}/bills`, { nickname, payee, payment_amount: amount, status: "recurring", recurring_date: day });
  }
  console.log("  bills: Rent, Utilities, Subscriptions");

  for (const [name, category, amount] of purchases) {
    if (!merchants.has(name)) merchants.set(name, (await write("/merchants", { name, category })).id);
    await write(`/accounts/${checking.id}/purchases`, {
      merchant_id: merchants.get(name),
      amount_cents: cents(amount),
      description: `${name} (${category})`,
    });
  }
  console.log(`  spending: ${purchases.length} purchases, $${spendTotal.toFixed(2)} total`);
}

// Nessie settles purchases a little after the fact. Wait until every checking
// account has landed on its expected balance (up to ~2 minutes).
console.log("\nWaiting for purchases to settle…");
for (let tries = 0; tries < 24; tries++) {
  await pause(5000);
  const states = await Promise.all(checkingAccounts.map((x) => nessieFetch(`/accounts/${x.id}`)));
  const done = states.every((s, i) => s.pending_debits_cents === 0 && s.balance_cents === cents(checkingAccounts[i].expected));
  if (done || tries === 23) {
    states.forEach((s, i) => console.log(`  ${checkingAccounts[i].name}: checking $${s.balance_cents / 100} (expected $${checkingAccounts[i].expected})`));
    break;
  }
}

console.log("\nDone. Make sure USE_NESSIE=true in .env, then restart npm run dev.");
