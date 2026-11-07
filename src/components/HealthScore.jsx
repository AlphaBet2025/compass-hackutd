// Semicircle gauge + the 4 indicator cards.
function Gauge({ score, label }) {
  const r = 80;
  const arc = Math.PI * r; // length of the half circle
  const filled = (score / 100) * arc;
  const color = score >= 75 ? "var(--good)" : score >= 45 ? "var(--ok)" : "var(--risky)";
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 115" role="img" aria-label={`Health score ${score} out of 100`}>
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

export default function HealthScore({ health, todayScore }) {
  const diff = health.score - todayScore;
  return (
    <section className="card">
      <div className="card-head">
        <h2>Financial health</h2>
        <span className="muted small">projected in 12 months</span>
      </div>

      <Gauge score={health.score} label={health.label} />
      <div className="today-line muted small">
        Today: {todayScore}
        {diff !== 0 && (
          <span className={diff > 0 ? "up" : "down"}> · {diff > 0 ? "▲" : "▼"} {Math.abs(diff)} points</span>
        )}
      </div>

      <ul className="indicators">
        {health.indicators.map((i) => (
          <li key={i.id} className="indicator">
            <div className="ind-top">
              <span className="ind-label">{i.label}</span>
              <span className={`pill ${i.status}`}>{i.display}</span>
            </div>
            <div className="bar">
              <div className={`bar-fill ${i.status}`} style={{ width: `${Math.max(i.score, 4)}%` }} />
            </div>
            <div className="ind-explain">
              {i.explain} <span className="muted">{i.target}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
