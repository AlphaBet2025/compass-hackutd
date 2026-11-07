# ◎ Compass: an AI financial co-pilot

Compass puts one customer's whole financial life on a single screen (checking, savings, CD, IRA, credit card and a Toyota auto loan), scores their financial health, forecasts the next 12 months, and **coaches them on what to do next in plain English**.

Built solo for **HackUTD ZeroDay 2026**.

> Most banking apps show you numbers. Compass tells you what to do with them.

## What it does

| Feature | What you get |
|---|---|
| **Account overview** | Every account and debt in one place, with net worth. |
| **Financial health score** | A 0–100 score from four indicators: emergency fund (months of cushion), credit utilization, debt-to-income, and savings rate. Each one is explained in plain English. |
| **12-month forecast** | A chart of cash, debt and net worth, including interest on the card and the loan. |
| **"What if…?" simulator** | Sliders for dining spend, an extra credit-card payment and income change. The forecast and the health score update live. |
| **Toyota next move** | Compares the car-loan rate to the card APR and recommends one clear next step, with the interest it would save. One click applies it to the simulator. |
| **AI coach (Gemini)** | Ask things like *"Should I pay my card or my car loan first?"* The coach reads the customer's real numbers and the current what-if settings. If the API fails, a built-in fallback answers from the same numbers. |

## Tracks entered

- **PNC: 360 Financial Health Navigator.** A health score, a forecast, a simulator and coaching.
- **Capital One: Best Use of Nessie.** Accounts, the loan and recurring bills load from the Nessie API.
- **Toyota Financial: What's Your Next Move?** The "Toyota next move" card compares the auto loan with other debt.
- **MLH: Best Use of the Gemini API.** The coach is grounded in the customer's real data.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/AlphaBet2025/compass-hackutd.git
cd compass-hackutd
npm install
cp .env.example .env     # on Windows PowerShell: copy .env.example .env
npm run dev
```

Then open **http://localhost:5173**.

It works with no keys at all. It uses built-in demo data, and the coach falls back to offline answers. Add keys to `.env` to turn on the real integrations:

| Variable | What it does |
|---|---|
| `GEMINI_API_KEY` | Turns on the Gemini coach. Free key at [aistudio.google.com](https://aistudio.google.com). |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.5-flash`. |
| `NESSIE_API_KEY` | Your Capital One Nessie key (`nsk_...`). |
| `USE_NESSIE` | Set to `true` to load the customer from Nessie. |

After editing `.env`, restart `npm run dev`.

### Using Nessie

1. Put your key in `.env` as `NESSIE_API_KEY`.
2. Run `npm run seed:nessie` once. It creates the demo customer (Jordan Rivera) in your Nessie sandbox. It does nothing if data already exists.
3. Set `USE_NESSIE=true` and restart. The top bar shows **● Live: Capital One Nessie**.

If Nessie is unreachable, the app falls back to the demo data automatically, so a demo never breaks.

## How it works

```
Browser (React + Vite)  ──►  Express server  ──►  Gemini API
   charts, sliders,           holds the secret     Capital One Nessie API
   score, coach chat          keys, caches Nessie
```

- **One source of math.** The score, forecast, simulator, Toyota card and coach all use the same functions in `src/lib/`. The coach's numbers always match the screen.
- **Keys stay on the server.** The browser never sees a Gemini or Nessie key. `.env` is git-ignored.
- **Nessie mapping.** Checking, Savings and Credit Card come from Nessie accounts. The auto loan comes from `/loans`. Rent, utilities and subscriptions come from `/bills`. The CD and IRA are Savings accounts with descriptive nicknames, since Nessie has no such account types. Nessie has no rate fields, so APR and APY are read from account nicknames. Responses are cached for 60 seconds to stay under the rate limit.
- **Grounded AI.** Each coach request includes a text summary of the customer's accounts, health indicators, next-move recommendation and any active what-if scenario. The model is told to use only those numbers.

### Project layout

```
server/            Express API: Gemini proxy, Nessie client, seed script
src/lib/           health score, forecast, next-move logic, coach context
src/components/    accounts, health, forecast, simulator, Toyota card, chat
src/data/          demo customer and simulator settings
```

## Limitations

- All data is synthetic. This is a hackathon prototype, not a bank.
- Compass gives educational guidance, not licensed financial advice.
- Health-score thresholds and the 7% IRA growth assumption are simple, documented guesses.

## Tech

React 18, Vite, Recharts, Node.js, Express, Google Gemini API, Capital One Nessie API.
