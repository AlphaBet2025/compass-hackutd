import { money } from "../lib/health.js";

export default function NextMoveCard({ move, onTry, applied }) {
  const max = Math.max(...move.rates.map((r) => r.pct));
  const monthsSooner = move.slowMonths - move.payoffMonths;

  return (
    <section className="move" aria-label="Your next move">
      <div className="move-left">
        <div className="move-tag">TOYOTA · YOUR NEXT MOVE</div>
        <h2>{move.headline}</h2>
        <p className="move-why">{move.why}</p>

        <ol className="move-steps">
          {move.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {move.apply && (
          <div className="move-actions">
            <button className="btn" onClick={onTry} disabled={applied}>
              {applied ? "✓ Applied in the simulator below" : `Try ${money(move.extra)}/mo in the simulator`}
            </button>
            {move.interestSaved ? (
              <span className="move-save">
                Saves about <b>{money(move.interestSaved)}</b> in total interest
                {monthsSooner > 0 && (
                  <> and finishes <b>{monthsSooner} months sooner</b></>
                )}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="move-right">
        {move.rates.map((r) => (
          <div className="rate" key={r.label}>
            <div className="rate-top"><span>{r.label}</span><b>{r.pct}%</b></div>
            <div className="rate-bar"><div className={`rate-fill ${r.tone}`} style={{ width: `${(r.pct / max) * 100}%` }} /></div>
          </div>
        ))}
        <div className="rate-gap">{move.rateNote}</div>
      </div>
    </section>
  );
}
