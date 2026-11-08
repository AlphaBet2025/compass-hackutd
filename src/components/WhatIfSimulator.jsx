import { Fragment } from "react";
import { SLIDERS } from "../data/simulatorConfig.js";
import { DEFAULT_ADJUST } from "../lib/forecast.js";
import { money } from "../lib/health.js";

function valueText(slider, v, customer) {
  if (slider.key === "extraCard" || slider.key === "extraLoan") return `+${money(v)}/mo`;
  if (slider.spendKey) {
    const saved = (customer.monthlySpending[slider.spendKey] * v) / 100;
    return v === 0 ? "No change" : `−${v}% (saves ${money(saved)}/mo)`;
  }
  if (slider.key === "incomeChange") {
    const diff = (customer.monthlyNetIncome * v) / 100;
    return v === 0 ? "No change" : `${v > 0 ? "+" : "−"}${Math.abs(v)}% (${v > 0 ? "+" : "−"}${money(Math.abs(diff))}/mo)`;
  }
  return v;
}

export default function WhatIfSimulator({ customer, adjust, setAdjust, surplus, overdrawn, shortfall }) {
  const changed = Object.keys(DEFAULT_ADJUST).some((k) => (adjust[k] ?? 0) !== DEFAULT_ADJUST[k]);

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
      <p className="muted small tight">
        Drag a slider. The forecast and health score update instantly.
        {customer.spendingSource === "nessie" && <> Spending amounts come from your last 30 days of Capital One transactions.</>}
      </p>

      <div className="sliders">
        {SLIDERS.map((s, i) => (
          <Fragment key={s.key}>
            {(i === 0 || (!s.spendKey && SLIDERS[i - 1].spendKey)) && (
              <div className="slider-group">{s.spendKey ? "Spending" : "Debt & income"}</div>
            )}
          <label className="slider">
            <div className="slider-top">
              <span className="slider-label">{s.label}</span>
              <span className="slider-val">{valueText(s, adjust[s.key] ?? 0, customer)}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={adjust[s.key] ?? 0}
              aria-valuetext={String(valueText(s, adjust[s.key] ?? 0, customer))}
              onChange={(e) => setAdjust({ ...adjust, [s.key]: Number(e.target.value) })}
            />
            <div className="muted small">{s.hint}</div>
          </label>
          </Fragment>
        ))}
      </div>

      <div className={`surplus ${overdrawn ? "warn" : ""}`}>
        {overdrawn && shortfall ? (
          <>
            <strong>⚠ This plan overdraws your checking account.</strong> It goes below $0 in <b>{shortfall.label}</b> (month {shortfall.month}) and
            hits <b>−{money(Math.abs(shortfall.lowest))}</b> at its lowest point.
            {surplus < 0 && <> You'd spend about <b>{money(Math.abs(surplus))}</b> more than you earn each month. Trim your extra payments or spending by that much to stay positive.</>}
          </>
        )
          : `You'd keep about ${money(Math.max(surplus, 0))} each month after bills and debt payments.`}
      </div>
    </section>
  );
}
