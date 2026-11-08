import { useEffect, useMemo, useRef, useState } from "react";
import { getTotals, getHealth, money } from "./lib/health.js";
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
import Hero from "./components/Hero.jsx";
import Logo from "./components/Logo.jsx";
import { people, getPerson } from "./data/customers.js";

// ✋ YOUR TURN: a temporary "Look" switcher so you can compare designs. Once you pick one,
// tell me and I'll remove the switcher and make it the default.
const THEMES = [["daylight", "Daylight"], ["midnight", "Midnight"], ["toyota", "Red"]];

// The name in the top bar opens a small card about the customer.
function ProfileMenu({ customer, source, personId, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initials = customer.name.split(" ").map((w) => w[0]).join("");

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className="profile" ref={ref}>
      <button className="who-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="avatar">{initials}</span> {customer.name} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="About this customer">
          <div className="pop-name">{customer.name}, {customer.age}</div>
          {/* ✋ YOUR TURN: write Jordan's story here in your own words. */}
          <p>
            A <b>made-up customer</b> (not a real person) who stands in for a typical young adult: {money(customer.monthlyNetIncome)}/month
            take-home, a credit card at {customer.accounts.creditCard.apr}% APR, and a Toyota loan at {customer.accounts.autoLoan.apr}%.
          </p>
          <div className="pop-switch" role="group" aria-label="Switch customer">
            <div className="pop-switch-title">Switch customer</div>
            {people.map((p) => (
              <button key={p.id} aria-pressed={personId === p.id} onClick={() => { onSwitch(p.id); setOpen(false); }}>
                <b>{p.data.name.split(" ")[0]}</b> <span>{p.tagline}</span>
              </button>
            ))}
          </div>
          <p className="muted small">
            {source === "nessie"
              ? "Accounts, loan, bills and spending are read live from Capital One's Nessie API."
              : "Showing built-in demo data (Nessie is switched off or unavailable)."}
          </p>
        </div>
      )}
    </div>
  );
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("compass-theme") || "daylight"; } catch { return "daylight"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("compass-theme", theme); } catch { /* fine without it */ }
  }, [theme]);
  return [theme, setTheme];
}

export function Dashboard({ customer, source, theme, setTheme, personId, onSwitch }) {
  const [adjustRaw, setAdjust] = useState(DEFAULT_ADJUST);
  const adjust = { ...DEFAULT_ADJUST, ...adjustRaw }; // fills in any missing slider with 0
  const [coachAsk, setCoachAsk] = useState(null); // lets other cards send a question to the coach

  const totals = getTotals(customer);
  const todayHealth = getHealth(customer);
  const move = useMemo(() => getNextMove(customer), []);
  const baseline = useMemo(() => runForecast(customer, DEFAULT_ADJUST), []);
  const scenario = useMemo(() => runForecast(customer, adjust), [adjust]);
  const changed = Object.keys(DEFAULT_ADJUST).some((k) => adjust[k] !== DEFAULT_ADJUST[k]);
  const applied = move.apply && Object.entries(move.apply).every(([k, v]) => adjust[k] === v);

  // Everything the AI coach is allowed to know, as plain text.
  const context = useMemo(
    () => buildCoachContext(customer, todayHealth, { ...scenario, baselineEnd: baseline.end }, adjust),
    [scenario, baseline, adjust, todayHealth]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo /> Compass
        </div>
        <div className="who">
          <div className="looks" role="group" aria-label="Choose a look">
            {THEMES.map(([id, label]) => (
              <button key={id} aria-pressed={theme === id} onClick={() => setTheme(id)}>{label}</button>
            ))}
          </div>
          <span className={`source ${source}`}>{source === "nessie" ? "● Live: Capital One Nessie" : "● Demo data"}</span>
          <ProfileMenu customer={customer} source={source} personId={personId} onSwitch={onSwitch} />
        </div>
      </header>

      <main className="container">
        <Hero customer={customer} totals={totals} health={todayHealth} move={move} />

        <NextMoveCard move={move} applied={applied} onTry={() => setAdjust({ ...adjust, ...move.apply })} />

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

// Loads the customer from our server (Nessie for Jordan if switched on, otherwise demo data).
export default function App() {
  const [personId, setPersonId] = useState("jordan");
  const [data, setData] = useState(null);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    let current = true;
    setData(null);
    fetch(`/api/customer?id=${personId}`)
      .then((r) => r.json())
      .then((d) => current && setData(d))
      .catch(() => current && setData({ source: "demo", customer: getPerson(personId).data }));
    return () => { current = false; };
  }, [personId]);

  if (!data)
    return (
      <div className="loading" role="status">
        <div className="spinner" />
        Loading accounts…
      </div>
    );
  return (
    <Dashboard
      key={personId}
      customer={data.customer}
      source={data.source}
      theme={theme}
      setTheme={setTheme}
      personId={personId}
      onSwitch={setPersonId}
    />
  );
}
