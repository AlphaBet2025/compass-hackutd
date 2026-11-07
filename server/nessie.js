// Capital One Nessie client. Only the server calls this, so the key never
// reaches the browser. Turns Nessie data into the same "customer" shape the
// app already uses, so the rest of the app doesn't care where data came from.

import { customer as demoCustomer } from "../src/data/customer.js";

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
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Nessie ${method} ${path} -> ${res.status}`);
  const data = await res.json();
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

export async function loadCustomerFromNessie() {
  const [accounts, loans, bills] = await Promise.all([listAll("/accounts"), listAll("/loans"), listAll("/bills")]);
  if (accounts.length === 0) throw new Error("Nessie has no accounts yet. Run: npm run seed:nessie");

  // Start from the demo profile (income, age, everyday spending), then overlay Nessie data.
  const c = structuredClone(demoCustomer);
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

  return c;
}
