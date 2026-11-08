import { useState } from "react";
import { getRunway } from "../lib/stress.js";
import { money } from "../lib/health.js";

const tone = (months) => (months >= 6 ? "good" : months >= 3 ? "ok" : "risky");

function Row({ label, sub, months, goal }) {
  return (
    <div className="stress-row">
      <div className="stress-row-top">
        <div>
          <div className="stress-label">{label}</div>
          <div className="muted small">{sub}</div>
        </div>
        <div className={`stress-months ${tone(months)}`}>{months.toFixed(1)} <span>months</span></div>
      </div>
      <div className="bar">
        <div className={`bar-fill ${tone(months)}`} style={{ width: `${Math.max(Math.min(months / goal, 1) * 100, 3)}%` }} />
      </div>
    </div>
  );
}

export default function StressTest({ customer, onAsk }) {
  const [ran, setRan] = useState(false);
  const r = getRunway(customer);

  return (
    <section className="card stress">
      <div className="card-head">
        <h2>Stress test</h2>
        <span className="muted small">what if your paycheck stopped?</span>
      </div>

      {!ran ? (
        <div className="stress-intro">
          <p>
            Imagine {customer.name.split(" ")[0]} lost their job tomorrow. How long could they keep paying rent, bills and
            debt on savings alone?
          </p>
          <button className="btn" onClick={() => setRan(true)}>Run the stress test</button>
        </div>
      ) : (
        <div className="stress-result">
          <div className="stress-headline">
            With no income, {customer.name.split(" ")[0]} runs out of cash in{" "}
            <b className={tone(r.nowMonths)}>{r.nowMonths.toFixed(1)} months</b>.
          </div>

          <Row label="Living as you do now" sub={`${money(r.nowOutflow)}/mo out, from ${money(r.liquid)} in checking + savings`} months={r.nowMonths} goal={r.goalMonths} />
          <Row label="Essentials only" sub={`Cut dining, shopping and subscriptions: ${money(r.leanOutflow)}/mo`} months={r.leanMonths} goal={r.goalMonths} />
          <Row label="Essentials + break the CD" sub="CD money too (an early-withdrawal penalty may apply)" months={r.cdMonths} goal={r.goalMonths} />

          <div className="stress-foot">
            <span>
              A safe goal is <b>{r.goalMonths} months</b>.
              {r.gapToGoal > 0 ? <> You'd need about <b>{money(r.gapToGoal)}</b> more in savings to get there.</> : " You're there!"}
            </span>
            <button
              className="btn"
              onClick={() => onAsk(`If I lost my income tomorrow, how long could I last and what should I do to be safer?`)}
            >
              Ask the coach what to do
            </button>
          </div>
          <button className="link-btn" onClick={() => setRan(false)}>Hide</button>
        </div>
      )}
    </section>
  );
}
