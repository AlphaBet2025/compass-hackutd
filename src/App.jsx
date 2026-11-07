import { useMemo, useState } from "react";
import { customer } from "./data/customer.js";
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

export default function App() {
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);

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
          <HealthScore health={scenario.health} todayScore={todayHealth.score} />
        </div>

        <div className="grid grid-wide">
          <WhatIfSimulator
            customer={customer}
            adjust={adjust}
            setAdjust={setAdjust}
            surplus={scenario.monthlySurplus}
            overdrawn={scenario.overdrawn}
          />
          <ForecastChart points={scenario.points} baseline={baseline} changed={changed} />
        </div>

        <CoachChat customer={customer} context={context} adjust={adjust} />
      </main>
    </div>
  );
}
