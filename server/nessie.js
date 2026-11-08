// Capital One Nessie client. Only the server calls this, so the key never
// reaches the browser. Turns Nessie data into the same "customer" shape the
// app already uses, so the rest of the app doesn't care where data came from.

import { getPerson } from "../src/data/customers.js";

const BASE = process.env.NESSIE_URL || "https://v2-prod-api.nessieisreal.com";

// Nessie allows 120 requests/minute, so remember answers for a minute.
const CACHE_MS = 60_000;
const cache = new Map();

export async function nessieFetch(path, { method = "GET", body, cached = false } = {}) {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error("NESSIE_API_KEY is not set");

  if (cached && cache.has(path) && Date.now() - cache.get(path).at < CACHE_MS) {
    return cache.get(path).data;
  }
  // If Nessie says "slow down" (429), wait and try again instead of failing.
  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status !== 429) break;
    const wait = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  if (!res.ok) throw new Error(`Nessie ${method} ${path} -> ${res.status}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (cached) cache.set(path, { at: Date.now(), data });
  return data;
}

async function listAll(path) {
  const items = [];
  let cursor = "";
  do {
    const sep = path.includes("?") ? "&" : "?";
    const page = await nessieFetch(`${path}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { cached: true });
    items.push(...(page.items || []));
    cursor = page.next_cursor || "";
  } while (cursor);
  return items;
}

const dollars = (cents) => Math.round(cents) / 100;
// Nessie has no APR/APY field, so we read it from the nickname, e.g. "Visa · 24.99% APR".
const rateFrom = (text, fallback) => {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(text || "");
  return m ? Number(m[1]) : fallback;
};

// Which of our spending lines a Nessie merchant category belongs to.
function spendingBucket(category = "", name = "") {
  const t = `${category} ${name}`.toLowerCase();
  if (/groc|supermarket|market/.test(t)) return "groceries";
  if (/dining|restaurant|cafe|coffee|fast food|food/.test(t)) return "dining";
  if (/transport|gas|fuel|transit|rideshare|auto|insurance|parking/.test(t)) return "transport";
  return "other";
}

// Last 30 days of purchases from the customer's accounts, grouped into categories.
async function loadSpending(accounts) {
  const merchants = new Map((await listAll("/merchants")).map((m) => [m.id, m]));
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const totals = {}; // bucket -> dollars
  const byMerchant = {}; // bucket -> { merchant name -> dollars }
  let count = 0;

  for (const acct of accounts.filter((x) => x.type === "Checking" || x.type === "Credit Card")) {
    const page = await nessieFetch(`/accounts/${acct.id}/transactions?limit=500`, { cached: true });
    for (const t of page.items || []) {
      if (t.kind !== "purchase" || !["pending", "completed"].includes(t.status)) continue;
      if (t.payer_id !== acct.id || Date.parse(t.created_at) < since) continue;
      const m = merchants.get(t.merchant_id);
      const bucket = spendingBucket(m?.category, m?.name);
      const dollarsSpent = t.amount_cents / 100;
      totals[bucket] = (totals[bucket] || 0) + dollarsSpent;
      byMerchant[bucket] ??= {};
      byMerchant[bucket][m?.name || "Other"] = (byMerchant[bucket][m?.name || "Other"] || 0) + dollarsSpent;
      count++;
    }
  }
  return { totals, byMerchant, count };
}

export async function loadCustomerFromNessie(personId = "jordan") {
  // The demo profile supplies what Nessie has no place for (income, age); Nessie supplies the rest.
  const base = getPerson(personId).data;
  const [first, ...rest] = base.name.split(" ");
  const last = rest.join(" ");

  // Find this person's customer record in Nessie, then only THEIR accounts, loans and bills.
  const customers = await listAll("/customers");
  const me = customers.find((x) => x.first_name === first && x.last_name === last);
  if (!me) throw new Error(`${base.name} isn't in Nessie yet. Run: npm run seed:nessie -- --reset`);

  const [allAccounts, allLoans, allBills] = await Promise.all([listAll("/accounts"), listAll("/loans"), listAll("/bills")]);
  const accounts = allAccounts.filter((x) => x.customer_id === me.id);
  const ids = new Set(accounts.map((x) => x.id));
  const loans = allLoans.filter((l) => ids.has(l.account_id));
  const bills = allBills.filter((b) => ids.has(b.account_id));
  if (accounts.length === 0) throw new Error(`${base.name} has no accounts in Nessie yet`);

  const c = structuredClone(base);
  const a = c.accounts;
  const used = { savings: false, cd: false, ira: false };

  for (const acct of accounts) {
    const name = (acct.nickname || "").toLowerCase();
    if (acct.type === "Checking") {
      a.checking.balance = dollars(acct.balance_cents);
    } else if (acct.type === "Credit Card") {
      a.creditCard.balance = dollars(acct.balance_cents); // for cards this is the amount owed
      a.creditCard.limit = dollars(acct.credit_limit_cents);
      a.creditCard.apr = rateFrom(acct.nickname, a.creditCard.apr);
    } else if (acct.type === "Savings") {
      // CD and IRA aren't Nessie account types, so they're Savings accounts with telling nicknames.
      if (/\bira\b/.test(name)) {
        a.ira.balance = dollars(acct.balance_cents);
        used.ira = true;
      } else if (/\bcd\b/.test(name)) {
        a.cd.balance = dollars(acct.balance_cents);
        a.cd.apy = rateFrom(acct.nickname, a.cd.apy);
        used.cd = true;
      } else if (!used.savings) {
        a.savings.balance = dollars(acct.balance_cents);
        a.savings.apy = rateFrom(acct.nickname, a.savings.apy);
        used.savings = true;
      }
    }
  }

  const auto = loans.find((l) => /auto|car|toyota/i.test(`${l.type} ${l.description}`)) || loans[0];
  if (auto) {
    a.autoLoan.balance = dollars(auto.amount_cents);
    a.autoLoan.monthlyPayment = dollars(auto.monthly_payment_cents);
    a.autoLoan.apr = rateFrom(auto.description, a.autoLoan.apr);
    const vehicle = (auto.description || "").split("·")[0].trim();
    if (vehicle) a.autoLoan.vehicle = vehicle;
  }

  // Recurring bills replace the matching spending lines (rent, utilities, subscriptions).
  for (const b of bills) {
    if (!["recurring", "pending"].includes(b.status)) continue;
    const label = `${b.nickname || ""} ${b.payee || ""}`.toLowerCase();
    if (/rent/.test(label)) c.monthlySpending.rent = b.payment_amount;
    else if (/utilit|electric|water|internet/.test(label)) c.monthlySpending.utilities = b.payment_amount;
    else if (/subscri|netflix|spotify/.test(label)) c.monthlySpending.subscriptions = b.payment_amount;
  }

  // Everyday spending from real transactions. If there are none (or Nessie hiccups),
  // we keep the demo profile's spending so nothing breaks.
  c.spendingSource = "demo";
  try {
    const spending = await loadSpending(accounts);
    if (spending.count > 0) {
      for (const [bucket, amount] of Object.entries(spending.totals)) c.monthlySpending[bucket] = Math.round(amount);
      c.spendingSource = "nessie";
      c.spendingBreakdown = Object.fromEntries(
        Object.entries(spending.byMerchant).map(([bucket, merchants]) => [
          bucket,
          Object.entries(merchants)
            .sort((x, y) => y[1] - x[1])
            .slice(0, 3)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) })),
        ])
      );
      c.spendingTransactions = spending.count;
    }
  } catch (err) {
    console.error("Could not read Nessie transactions, using demo spending:", err.message);
  }

  return c;
}
