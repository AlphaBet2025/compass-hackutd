import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { money } from "../lib/health.js";

// ✋ YOUR TURN: pick your own chart colors here.
const COLORS = {
  cash: "#14a05b", // checking + savings + CD
  debt: "#e0443e", // card + car loan
  netWorth: "#2557f6",
  baseline: "#9aa5b8",
};

const k = (n) => (Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

export default function ForecastChart({ points, baseline, changed }) {
  // Put the "no changes" net worth next to each month so we can draw it dashed.
  const data = points.map((p, i) => ({ ...p, baselineNetWorth: baseline.points[i].netWorth }));
  const gain = points[points.length - 1].netWorth - baseline.end.netWorth;

  return (
    <section className="card">
      <div className="card-head">
        <h2>12-month forecast</h2>
        <span className="muted small">balances and debts</span>
      </div>

      <div className="stats">
        <div>
          <div className="muted small">Net worth in 12 months</div>
          <div className="stat-num">{money(points[points.length - 1].netWorth)}</div>
        </div>
        <div>
          <div className="muted small">Total debt in 12 months</div>
          <div className="stat-num">{money(points[points.length - 1].debt)}</div>
        </div>
        {changed && (
          <div className={`delta ${gain >= 0 ? "up" : "down"}`}>
            {gain >= 0 ? "+" : "−"}
            {money(Math.abs(gain))} vs. no changes
          </div>
        )}
      </div>

      <div className="chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e6eaf2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b778c" }} tickLine={false} axisLine={{ stroke: "#e6eaf2" }} />
            <YAxis tickFormatter={k} tick={{ fontSize: 12, fill: "#6b778c" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e6eaf2" }} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
            {changed && (
              <Line name="Net worth (no changes)" dataKey="baselineNetWorth" stroke={COLORS.baseline} strokeDasharray="5 4" strokeWidth={2} dot={false} />
            )}
            <Line name="Net worth" dataKey="netWorth" stroke={COLORS.netWorth} strokeWidth={3} dot={false} />
            <Line name="Cash & savings" dataKey="cash" stroke={COLORS.cash} strokeWidth={2.5} dot={false} />
            <Line name="Total debt" dataKey="debt" stroke={COLORS.debt} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
