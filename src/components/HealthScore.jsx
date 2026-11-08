// The big gauge shows TODAY's score. The projected score (12 months out, using
// the what-if sliders) is the smaller secondary number and the tick on each bar.
function Gauge({ score, label }) {
  const r = 80;
  const arc = Math.PI * r; // length of the half circle
  const filled = (score / 100) * arc;
  const color = score >= 75 ? "var(--good)" : score >= 45 ? "var(--ok)" : "var(--risky)";
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 115" role="img" aria-label={`Health score today: ${score} out of 100`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--track)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arc}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="gauge-text">
        <div className="gauge-num">{score}</div>
        <div className="gauge-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

export default function HealthScore({ today, projected }) {
  const diff = projected.score - today.score;
  const projectedById = Object.fromEntries(projected.indicators.map((i) => [i.id, i]));

  return (
    <section className="card">
      <div className="card-head">
        <h2>Financial health</h2>
        <span className="muted small">today, out of 100</span>
      </div>

      <Gauge score={today.score} label={today.label} />

      <div className="proj-chip">
        <span className="muted">In 12 months</span>
        <b>{projected.score}</b>
        <span className="muted">({projected.label})</span>
        {diff !== 0 && (
          <span className={`proj-delta ${diff > 0 ? "up" : "down"}`}>
            {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}
          </span>
        )}
      </div>

      <div className="legend small muted">
        <span><i className="lg-bar" /> Today</span>
        <span><i className="lg-tick" /> In 12 months</span>
      </div>

      <ul className="indicators">
        {today.indicators.map((i) => {
          const p = projectedById[i.id];
          const better = p.score > i.score;
          const worse = p.score < i.score;
          return (
            <li key={i.id} className="indicator">
              <div className="ind-top">
                <span className="ind-label">{i.label}</span>
                <span className={`pill ${i.status}`}>{i.display}</span>
              </div>
              <div className="bar">
                <div className={`bar-fill ${i.status}`} style={{ width: `${Math.max(i.score, 4)}%` }} />
                <div className="bar-tick" style={{ left: `${Math.min(Math.max(p.score, 2), 98)}%` }} />
              </div>
              <div className="ind-explain">
                {i.explain} <span className="muted">{i.target}</span>
              </div>
              <div className={`ind-proj ${better ? "up" : worse ? "down" : ""}`}>
                In 12 months: <b>{p.display}</b> {better ? "▲" : worse ? "▼" : "·"}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
