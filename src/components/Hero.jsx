import { money } from "../lib/health.js";
import { getRunway } from "../lib/stress.js";

const tone = (score) => (score >= 75 ? "good" : score >= 45 ? "ok" : "risky");

// The top of the page: a greeting, ONE sentence about the biggest opportunity,
// and the three numbers that matter most.
export default function Hero({ customer, totals, health, move }) {
  const first = customer.name.split(" ")[0];
  const run = getRunway(customer);
  const weakest = [...health.indicators].sort((a, b) => a.score - b.score)[0];

  return (
    <section className="hero" aria-labelledby="hello">
      <h1 id="hello">Good to see you, {first}.</h1>

      {/* ✋ YOUR TURN: this sentence is the first thing a judge reads. Put it in your own words. */}
      <p className="insight">
        {move.cardFirst ? (
          <>
            <strong>Your biggest opportunity:</strong> your credit card costs <strong>{move.cardApr}%</strong> a year, almost{" "}
            {(move.cardApr / move.loanApr).toFixed(0)}× your Toyota loan. Paying it down first could save about{" "}
            <strong>{money(move.interestSaved ?? 0)}</strong> in interest.
          </>
        ) : (
          <>
            <strong>Your biggest opportunity:</strong> your {weakest.label.toLowerCase()} is the weakest spot at {weakest.display}.
          </>
        )}
      </p>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Net worth</div>
          <div className="kpi-value">{money(totals.netWorth)}</div>
          <div className="kpi-sub">{money(totals.assets)} assets · {money(totals.debts)} debt</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Health score today</div>
          <div className={`kpi-value ${tone(health.score)}`}>{health.score}<span className="muted small"> / 100</span></div>
          <div className="kpi-sub">{health.label}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Cash runway</div>
          <div className={`kpi-value ${run.nowMonths >= 6 ? "good" : run.nowMonths >= 3 ? "ok" : "risky"}`}>
            {run.nowMonths.toFixed(1)}<span className="muted small"> months</span>
          </div>
          <div className="kpi-sub">if income stopped today</div>
        </div>
      </div>
    </section>
  );
}
