import { money } from "../lib/health.js";

// Everyday spending lines, matched to the slider that cuts each one.
const LINES = [
  { key: "groceries", label: "Groceries", cut: "groceriesCut" },
  { key: "dining", label: "Dining out", cut: "diningCut" },
  { key: "transport", label: "Transport", cut: "transportCut" },
  { key: "other", label: "Shopping & other", cut: "otherCut" },
];

// "Where your money goes": last 30 days of spending. Drag a "cut" slider and the
// bar shrinks, with the saved part shown in green.
export default function SpendingCard({ customer, adjust }) {
  const spend = customer.monthlySpending;
  const rows = LINES.map((l) => {
    const base = spend[l.key] || 0;
    const pct = adjust[l.cut] || 0;
    const after = base * (1 - pct / 100);
    const top = customer.spendingBreakdown?.[l.key]?.[0]?.name;
    return { ...l, base, after, saved: base - after, top };
  });
  const max = Math.max(...rows.map((r) => r.base), 1);
  const fixed = (spend.rent || 0) + (spend.utilities || 0) + (spend.subscriptions || 0);
  const everyday = rows.reduce((s, r) => s + r.after, 0);
  const live = customer.spendingSource === "nessie";

  return (
    <section className="card spend">
      <div className="card-head">
        <h2>Where your money goes</h2>
        <span className="muted small">{live ? "Last 30 days" : "Typical month"}</span>
      </div>

      <ul className="spend-list">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="spend-top">
              <span className="spend-label">
                {r.label}
                {r.top && <span className="muted small"> · mostly {r.top}</span>}
              </span>
              <span className="spend-amt">
                {money(r.after)}
                {r.saved > 0 && <span className="spend-saved"> −{money(r.saved)}</span>}
              </span>
            </div>
            <div className="spend-bar" role="img" aria-label={`${r.label}: ${money(r.after)} a month`}>
              <div className="spend-fill" style={{ width: `${(r.after / max) * 100}%` }} />
              {r.saved > 0 && <div className="spend-cut" style={{ width: `${(r.saved / max) * 100}%` }} />}
            </div>
          </li>
        ))}
      </ul>

      <div className="spend-foot">
        <span>Fixed bills (rent, utilities, subscriptions)</span>
        <b>{money(fixed)}</b>
      </div>
      <div className="muted small spend-note">
        {live
          ? `Everyday spending is ${money(everyday)}/mo, from ${customer.spendingTransactions} real Capital One transactions.`
          : `Everyday spending is ${money(everyday)}/mo (demo data).`}
      </div>
    </section>
  );
}
