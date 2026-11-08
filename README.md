# ◎ Compass: an AI financial co-pilot

Compass puts one customer's whole financial life on a single screen (checking, savings, CD, IRA, credit card and a Toyota auto loan), scores their financial health, forecasts the next 12 months, and **tells them the one smart thing to do next, in plain English**.

Built solo for **HackUTD ZeroDay 2026**.

> Most banking apps show you numbers. Compass tells you what to do with them.

## The idea in 30 seconds

Three made-up customers, each with different money problems, all loaded **live from Capital One's Nessie API**:

| Customer | Situation | What Compass says |
|---|---|---|
| **Jordan, 28** | Paying 24.99% on a credit card while saving at 4% | **Pay the card first, not the Toyota.** About $500 a month clears it in 6 months instead of 31 and saves roughly $1,010 in interest. |
| **Maya, 24** | An 11.4% Toyota loan and a thin cushion | **Pay extra on the Toyota loan.** About $350 a month finishes it in 19 months instead of 43. |
| **Dev, 35** | Strong savings and a 2.9% Toyota loan | **Don't rush the loan.** Put extra money into retirement instead. |

Same engine, different advice. Click the customer's name in the top bar to switch.

## What it does

| Feature | What you get |
|---|---|
| **Account overview** | Every account and debt in one place, with net worth. |
| **Financial health score** | A 0–100 score from four indicators: emergency fund (months of cushion), credit utilization, debt-to-income, and savings rate. The big gauge is **today's** score. A smaller number and a tick on each bar show where it lands in 12 months. |
| **12-month forecast** | A chart of cash, debt and net worth, including interest on the card and the loan. |
| **"What if…?" simulator** | Seven sliders (cut dining, groceries, transport or shopping; extra credit-card payment; extra Toyota-loan payment; income change). The forecast, health score and spending bars update live. If a plan would overdraw checking, it says in which month and by how much. |
| **Toyota next move** | Compares the car-loan rate to other debts and savings, and recommends one clear next step with the interest it would save. One click applies it to the simulator. Four possible answers: pay the card first, build a safety net first, pay extra on the Toyota loan, or you're on track. |
| **AI coach (Gemini)** | Ask things like *"Should I pay my card or my car loan first?"* The coach reads the customer's real numbers, spending by merchant and the current what-if settings. When it recommends something, it attaches an **Apply this plan** button that moves the sliders. If the API fails, a built-in fallback answers from the same numbers. |
| **Stress test** | "What if your paycheck stopped?" Shows how many months of runway there are today, on essentials only, and if the CD is cashed out. One click sends the question to the coach. |
| **Where your money goes** | Spending by category from real Nessie transactions, with the top merchants. The bars shrink as you drag the cut sliders. |

## Tracks entered

- **PNC: 360 Financial Health Navigator.** Health score, forecast, simulator, stress test and coaching.
- **Capital One: Best Use of Nessie.** Customers, accounts, loans, bills and purchase transactions are all read from the Nessie API, for three separate customers.
- **Toyota Financial: What's Your Next Move?** The "Toyota next move" card weighs the auto loan against other debts and savings, with different answers for different customers.
- **MLH: Best Use of the Gemini API.** The coach is grounded in each customer's real data, and can turn its advice into an action.

## Try it in 60 seconds

1. Open the app. Read the **biggest opportunity** line at the top.
2. In the red **Toyota next move** card, click **Try $500/mo in the simulator**. Watch the forecast and health score change.
3. Drag **Cut dining out** and watch the **Where your money goes** bar shrink.
4. In the coach, click *"Should I pay my card or my car loan first?"* and then **Apply this plan**.
5. Click **Run the stress test**.
6. Click the name in the top right and switch to **Maya** or **Dev** to see different advice.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/AlphaBet2025/compass-hackutd.git
cd compass-hackutd
npm install
cp .env.example .env     # on Windows PowerShell: copy .env.example .env
npm run dev
```

Then open **http://localhost:5173**. One command starts both the web app and the small API server.

**It works with no keys at all.** It uses built-in demo data, and the coach falls back to offline answers. Add keys to `.env` to turn on the real integrations:

| Variable | What it does |
|---|---|
| `GEMINI_API_KEY` | Turns on the Gemini coach. Free key at [aistudio.google.com](https://aistudio.google.com). |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.5-flash`. Model names change often, so override here if one is retired. |
| `NESSIE_API_KEY` | Your Capital One Nessie key (`nsk_...`). |
| `NESSIE_URL` | Optional. Defaults to `https://v2-prod-api.nessieisreal.com`. |
| `USE_NESSIE` | Set to `true` to load customers from Nessie. |

After editing `.env`, restart `npm run dev`.

### Using Nessie

1. Put your key in `.env` as `NESSIE_API_KEY`.
2. Run `npm run seed:nessie -- --reset` once. It creates the three customers (accounts, Toyota loan, recurring bills and a month of purchases) in your Nessie sandbox. **`--reset` wipes everything in that sandbox first.** It takes 3–4 minutes because Nessie rate-limits writes and settles purchases a little after the fact.
3. Set `USE_NESSIE=true` and restart. The top bar shows **● Live: Capital One Nessie**.

If Nessie is unreachable, the selected customer falls back to built-in demo data automatically, and the badge says **Demo data**, so a demo never breaks.

## How it works

```
Browser (React + Vite)  ──►  Express server  ──►  Gemini API
   charts, sliders,           holds the secret     Capital One Nessie API
   score, coach chat          keys, caches Nessie
```

- **One source of math.** The score, forecast, simulator, next-move card, stress test and coach all use the same functions in `src/lib/`, so the coach's numbers always match the screen.
- **Keys stay on the server.** The browser never sees a Gemini or Nessie key. `.env` is git-ignored.
- **Nessie mapping.** Each customer's Checking, Savings and Credit Card come from their Nessie accounts. The auto loan comes from `/loans`. Rent, utilities and subscriptions come from `/bills`. Everyday spending comes from `/accounts/{id}/transactions`, grouped by merchant category over the last 30 days. The CD and IRA are Savings accounts with descriptive nicknames, since Nessie has no such account types. Nessie has no rate fields, so APR and APY are read from the account and loan nicknames. Income and age come from a local profile. Responses are cached for 60 seconds to stay under the rate limit.
- **Grounded AI.** Each coach request includes a text summary of the customer's accounts, spending by merchant, health indicators, next-move recommendation, stress test and any active what-if scenario. The model is told to use only those numbers. Any plan it proposes is snapped to the real slider ranges on the server before it reaches the page.
- **Honest numbers.** The interest saved is calculated month by month and covers the **life of the debt** (for example 31 months versus 6), not just the next 12 months.

### Project layout

```
server/            Express API: Gemini proxy, Nessie client, seed script
src/lib/           health score, forecast, next-move logic, stress test, coach context
src/components/    hero, accounts, health, forecast, simulator, Toyota card, spending, stress test, chat
src/data/          sample customers and simulator settings
```

## Limitations

- All data is synthetic. This is a hackathon prototype, not a bank, and there is no sign-in. In production, a customer would authorize Compass to read their accounts.
- Compass gives educational guidance, not licensed financial advice.
- The health-score thresholds, the 7% Roth IRA growth assumption and the stress test (cash divided by monthly bills, ignoring interest and unemployment benefits) are simple, documented guesses.
- Nessie's seeded purchases are dated when you run the seed script, so the spending card is live for 30 days after seeding. After that it falls back to the built-in numbers until you reseed.
- Paying down debt early uses up cash, so the projected health score can dip slightly even while net worth and debt improve.

## How it was built

Built over one weekend as a first hackathon project, working with **Claude Code** as a coding partner for the implementation.

## Tech

React 18, Vite, Recharts, Node.js, Express, Google Gemini API, Capital One Nessie API.
