import { useEffect, useMemo, useRef, useState } from "react";
import { getTotals, getHealth, money } from "./lib/health.js";
import { runForecast, DEFAULT_ADJUST } from "./lib/forecast.js";
import { getNextMove } from "./lib/nextMove.js";
import { buildCoachContext } from "./lib/coachContext.js";
import { getRunway } from "./lib/stress.js";
import AccountsOverview from "./components/AccountsOverview.jsx";
import HealthScore from "./components/HealthScore.jsx";
import ForecastChart from "./components/ForecastChart.jsx";
import WhatIfSimulator from "./components/WhatIfSimulator.jsx";
import NextMoveCard from "./components/NextMoveCard.jsx";
import CoachChat from "./components/CoachChat.jsx";
import StressTest from "./components/StressTest.jsx";
import SpendingCard from "./components/SpendingCard.jsx";
import Hero, { Bold } from "./components/Hero.jsx";
import CompassHub from "./components/CompassHub.jsx";
import ShopView from "./components/ShopView.jsx";
import StoryView from "./components/StoryView.jsx";
import Logo from "./components/Logo.jsx";
import { people, getPerson } from "./data/customers.js";

// ✋ YOUR TURN: a temporary "Look" switcher for the Classic view. Once you pick one,
// tell me and I'll remove the switcher and make it the default.
const THEMES = [["daylight", "Daylight"], ["midnight", "Midnight"], ["toyota", "Red"]];

// The same app, four ways. Compass is the main view; the others are alternate views of the same data.
const VIEWS = [["hub", "Compass"], ["shop", "Shop"], ["story", "Story"], ["classic", "Classic"]];
const MODE_CLASS = { hub: " hub-mode", shop: " shop-mode", story: " story-mode", classic: "" };

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

// Remembers which view you picked (new visitors start on Compass). A link like /?view=shop opens straight to one.
function useView() {
  const [view, setView] = useState(() => {
    const valid = (v) => VIEWS.some(([id]) => id === v);
    try {
      const fromLink = new URLSearchParams(window.location.search).get("view");
      if (valid(fromLink)) return fromLink;
      const saved = localStorage.getItem("compass-view");
      if (valid(saved)) return saved;
    } catch { /* fall through */ }
    return "hub";
  });
  useEffect(() => {
    try { localStorage.setItem("compass-view", view); } catch { /* fine without it */ }
  }, [view]);
  return [view, setView];
}

export function Dashboard({ customer, source, theme, setTheme, personId, onSwitch }) {
  const [adjustRaw, setAdjust] = useState(DEFAULT_ADJUST);
  const adjust = { ...DEFAULT_ADJUST, ...adjustRaw }; // fills in any missing slider with 0
  const [coachAsk, setCoachAsk] = useState(null); // lets other cards send a question to the coach
  const [view, setView] = useView();
  const query = (() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } })();
  // Which section is picked (compass heading / shop product). /?section=whatif opens straight to one.
  const [section, setSection] = useState(query.get("section") || "move");
  const [shopOpen, setShopOpen] = useState(query.get("open") === "1");

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

  // Take the user to a section, whichever view they're in.
  const go = (id) => {
    setSection(id);
    if (view === "shop") setShopOpen(true);
    else if (view === "story") document.getElementById(`scene-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (view === "classic") document.getElementById(id === "coach" ? "coach" : "whatif")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const applyMove = () => {
    setAdjust({ ...adjust, ...move.apply });
    if (view !== "classic") go("whatif");
  };
  const applyPlan = (p) => {
    setAdjust(Object.fromEntries(Object.keys(DEFAULT_ADJUST).map((k) => [k, p[k] || 0])));
    go("whatif");
  };
  const askCoach = (text) => {
    setCoachAsk({ id: Date.now(), text });
    go("coach");
  };

  const first = customer.name.split(" ")[0];
  const run = getRunway(customer);
  const forecastCard = <ForecastChart points={scenario.points} baseline={baseline} changed={changed} />;
  const simulator = (
    <WhatIfSimulator
      customer={customer}
      adjust={adjust}
      setAdjust={setAdjust}
      surplus={scenario.monthlySurplus}
      overdrawn={scenario.overdrawn}
      shortfall={scenario.shortfall}
    />
  );
  const coach = (
    <CoachChat
      externalQuestion={coachAsk}
      onExternalHandled={() => setCoachAsk(null)}
      customer={customer}
      context={context}
      adjust={adjust}
      onApplyPlan={applyPlan}
    />
  );

  // Every feature as one piece, so each view can lay them out its own way.
  const panels = {
    move: <NextMoveCard move={move} applied={applied} onTry={applyMove} />,
    health: <HealthScore today={todayHealth} projected={scenario.health} />,
    forecast: forecastCard,
    whatif: (
      <div className="hub-stack">
        {simulator}
        {forecastCard}
      </div>
    ),
    stress: <StressTest customer={customer} onAsk={askCoach} />,
    spending: <SpendingCard customer={customer} adjust={adjust} />,
    accounts: <AccountsOverview customer={customer} totals={totals} />,
    coach,
  };

  // Small live numbers shown on the shop shelves.
  const spend = customer.monthlySpending;
  const everyday = (spend.groceries || 0) + (spend.dining || 0) + (spend.transport || 0) + (spend.other || 0);
  const gain = scenario.end.netWorth - totals.netWorth;
  const nChanges = Object.keys(DEFAULT_ADJUST).filter((k) => adjust[k] !== DEFAULT_ADJUST[k]).length;
  const shopStats = {
    move: move.interestSaved ? `Saves about ${money(move.interestSaved)}` : "Your best next step",
    health: `${todayHealth.score} / 100 · ${todayHealth.label}`,
    forecast: `${gain >= 0 ? "+" : "−"}${money(Math.abs(gain))} in 12 months`,
    whatif: nChanges ? `${nChanges} change${nChanges > 1 ? "s" : ""} in your plan` : "Nothing set yet",
    stress: `${run.nowMonths.toFixed(1)} months of runway`,
    spending: `${money(everyday)} a month`,
    accounts: `${money(totals.netWorth)} net worth`,
    coach: "Ask it anything",
  };

  return (
    <div className={`app${MODE_CLASS[view] || ""}`}>
      <header className="topbar">
        <div className="brand">
          <Logo /> Compass
        </div>
        <div className="who">
          <div className="looks" role="group" aria-label="Choose a view">
            {VIEWS.map(([id, label]) => (
              <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
            ))}
          </div>
          {view === "classic" && (
            <div className="looks" role="group" aria-label="Choose a look">
              {THEMES.map(([id, label]) => (
                <button key={id} aria-pressed={theme === id} onClick={() => setTheme(id)}>{label}</button>
              ))}
            </div>
          )}
          <span className={`source ${source}`}>{source === "nessie" ? "● Live: Capital One Nessie" : "● Demo data"}</span>
          <ProfileMenu customer={customer} source={source} personId={personId} onSwitch={onSwitch} />
        </div>
      </header>

      {view === "hub" && (
        <CompassHub
          selected={section}
          onSelect={setSection}
          greeting={
            <div className="hub-greet">
              <h1>Good to see you, {first}.</h1>
              <p className="tagline">Compass is an AI co-pilot for your money. It reads your accounts and tells you the one thing to do next.</p>
              <p className="insight">
                <strong>Your biggest opportunity:</strong> <Bold text={move.insight} />
              </p>
            </div>
          }
          stats={
            <>
              <div className="hub-stat"><span>Net worth</span><b>{money(totals.netWorth)}</b></div>
              <div className="hub-stat"><span>Health today</span><b>{todayHealth.score}<small> / 100</small></b></div>
              <div className="hub-stat"><span>Runway</span><b>{run.nowMonths.toFixed(1)}<small> mo</small></b></div>
            </>
          }
          panels={panels}
        />
      )}

      {view === "shop" && (
        <ShopView
          first={first}
          panels={panels}
          stats={shopStats}
          selected={section}
          open={shopOpen}
          onOpen={(id) => { setSection(id); setShopOpen(true); }}
          onClose={() => setShopOpen(false)}
          adjust={adjust}
          setAdjust={setAdjust}
          scenario={scenario}
          baseline={baseline}
        />
      )}

      {view === "story" && <StoryView first={first} totals={totals} health={todayHealth} move={move} run={run} panels={panels} />}

      {view === "classic" && (
        <main className="container">
          <Hero customer={customer} totals={totals} health={todayHealth} move={move} />

          <NextMoveCard move={move} applied={applied} onTry={applyMove} />

          <div className="grid grid-equal">
            <AccountsOverview customer={customer} totals={totals} />
            <HealthScore today={todayHealth} projected={scenario.health} />
          </div>

          <div className="grid grid-wide" id="whatif">
            {simulator}
            <div className="stack">
              {forecastCard}
              <StressTest customer={customer} onAsk={askCoach} />
              <SpendingCard customer={customer} adjust={adjust} />
            </div>
          </div>

          {coach}
        </main>
      )}
      <footer className="disclaimer">
        Sample data from Capital One's Nessie sandbox. Educational guidance, not financial advice.
      </footer>
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
    // If the server is slow, show the built-in demo data after 10 seconds instead of spinning forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    fetch(`/api/customer?id=${personId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => current && setData(d))
      .catch(() => current && setData({ source: "demo", customer: getPerson(personId).data }))
      .finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
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
