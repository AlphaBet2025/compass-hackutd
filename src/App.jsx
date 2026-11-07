import { customer } from "./data/customer.js";
import { getTotals, getHealth } from "./lib/health.js";
import AccountsOverview from "./components/AccountsOverview.jsx";
import HealthScore from "./components/HealthScore.jsx";

export default function App() {
  const totals = getTotals(customer);
  const health = getHealth(customer);

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
          <p>Here's all your money in one place, and how healthy it looks today.</p>
        </div>

        <div className="grid">
          <AccountsOverview customer={customer} totals={totals} />
          <HealthScore health={health} />
        </div>
      </main>
    </div>
  );
}
