import { useEffect, useMemo, useState } from "react";
import { customer as demoCustomer } from "./data/customer.js";
import { getTotals, getHealth } from "./lib/health.js";
import { runForecast, DEFAULT_ADJUST } from "./lib/forecast.js";
import { getNextMove } from "./lib/nextMove.js";
import { buildCoachContext } from "./lib/coachContext.js";
import AccountsOverview from "./components/AccountsOverview.jsx";
import HealthScore from "./components/HealthScore.jsx";
import ForecastChart from "./components/ForecastChart.jsx";
import WhatIfSimulator from "./components/WhatIfSimulator.jsx";
import NextMoveCard from "./components/NextMoveCard.jsx";
import CoachChat from "./components/CoachChat.jsx";
import StressTest from "./components/StressTest.jsx";

function Dashboard({ customer, source }) {
  const [adjustRaw, setAdjust] = useState(DEFAULT_ADJUST);
  const adjust = { ...DEFAULT_ADJUST, ...adjustRaw }; // fills in any missing slider with 0
  const [coachAsk, setCoachAsk] = useState(null); // lets other cards send a question to the coach

  const totals = getTotals(customer);
  const todayHealth = getHealth(customer);
  const move = useMemo(() => getNextMove(customer), []);
  const baseline = useMemo(() => runForecast(customer, DEFAULT_ADJUST), []);
  const scenario = useMemo(() => runForecast(customer, adjust), [adjust]);
  const changed = Object.keys(DEFAULT_ADJUST).some((k) => adjust[k] !== DEFAULT_ADJUST[k]);
  const applied = move.cardFirst && adjust.extraCard === move.extra;

  // Everything the AI coach is allowed to know, as plain text.
  const context = useMemo(
    () => buildCoachContext(customer, todayHealth, { ...scenario, baselineEnd: baseline.end }, adjust),
    [scenario, baseline, adjust, todayHealth]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◎</span> Compass
        </div>
        <div className="who">
          <span className={`source ${source}`}>{source === "nessie" ? "● Live: Capital One Nessie" : "● Demo data"}</span>
          <span className="avatar">JR</span> {customer.name}
        </div>
      </header>

      <main className="container">
        <div className="hello">
          <h1>Good to see you, {customer.name.split(" ")[0]}.</h1>
          <p>Here's all your money in one place, and what to do next.</p>
        </div>

        <NextMoveCard move={move} applied={applied} onTry={() => setAdjust({ ...adjust, extraCard: move.extra })} />

        <div className="grid">
          <AccountsOverview customer={customer} totals={totals} />
          <HealthScore today={todayHealth} projected={scenario.health} />
        </div>

        <div className="grid grid-wide" id="whatif">
          <WhatIfSimulator
            customer={customer}
            adjust={adjust}
            setAdjust={setAdjust}
            surplus={scenario.monthlySurplus}
            overdrawn={scenario.overdrawn}
          />
          <ForecastChart points={scenario.points} baseline={baseline} changed={changed} />
        </div>

        <StressTest
          customer={customer}
          onAsk={(text) => {
            setCoachAsk({ id: Date.now(), text });
            document.getElementById("coach")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        <CoachChat
          externalQuestion={coachAsk}
          customer={customer}
          context={context}
          adjust={adjust}
          onApplyPlan={(p) => {
            setAdjust(Object.fromEntries(Object.keys(DEFAULT_ADJUST).map((k) => [k, p[k] || 0])));
            document.getElementById("whatif")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </main>
    </div>
  );
}

// Loads the customer from our server (Nessie if switched on, otherwise demo data).
export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/customer")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ source: "demo", customer: demoCustomer }));
  }, []);

  if (!data) return <div className="loading">Loading your accounts…</div>;
  return <Dashboard customer={data.customer} source={data.source} />;
}
