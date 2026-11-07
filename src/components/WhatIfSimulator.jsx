import { SLIDERS } from "../data/simulatorConfig.js";
import { DEFAULT_ADJUST } from "../lib/forecast.js";
import { money } from "../lib/health.js";

function valueText(key, v, customer) {
  if (key === "extraCard") return `+${money(v)}/mo`;
  if (key === "diningCut") {
    const saved = (customer.monthlySpending.dining * v) / 100;
    return v === 0 ? "No change" : `−${v}% (saves ${money(saved)}/mo)`;
  }
  if (key === "incomeChange") {
    const diff = (customer.monthlyNetIncome * v) / 100;
    return v === 0 ? "No change" : `${v > 0 ? "+" : "−"}${Math.abs(v)}% (${v > 0 ? "+" : "−"}${money(Math.abs(diff))}/mo)`;
  }
  return v;
}

export default function WhatIfSimulator({ customer, adjust, setAdjust, surplus, overdrawn }) {
  const changed = Object.keys(DEFAULT_ADJUST).some((k) => adjust[k] !== DEFAULT_ADJUST[k]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>What if…?</h2>
        {changed && (
          <button className="link-btn" onClick={() => setAdjust(DEFAULT_ADJUST)}>
            Reset
          </button>
        )}
      </div>
      <p className="muted small tight">Drag a slider. The forecast and health score update instantly.</p>

      <div className="sliders">
        {SLIDERS.map((s) => (
          <label key={s.key} className="slider">
            <div className="slider-top">
              <span className="slider-label">{s.label}</span>
              <span className="slider-val">{valueText(s.key, adjust[s.key], customer)}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={adjust[s.key]}
              onChange={(e) => setAdjust({ ...adjust, [s.key]: Number(e.target.value) })}
            />
            <div className="muted small">{s.hint}</div>
          </label>
        ))}
      </div>

      <div className={`surplus ${overdrawn ? "warn" : ""}`}>
        {overdrawn
          ? "⚠ Careful: this plan would drain your checking account."
          : `You'd keep about ${money(Math.max(surplus, 0))} each month after bills and debt payments.`}
      </div>
    </section>
  );
}
