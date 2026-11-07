import { money } from "../lib/health.js";

export default function NextMoveCard({ move, onTry, applied }) {
  const max = Math.max(move.cardApr, move.loanApr);
  return (
    <section className="move">
      <div className="move-left">
        <div className="move-tag">TOYOTA · YOUR NEXT MOVE</div>
        <h2>{move.headline}</h2>
        <p className="move-why">{move.why}</p>

        <ol className="move-steps">
          {move.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {move.cardFirst && (
          <div className="move-actions">
            <button className="btn" onClick={onTry} disabled={applied}>
              {applied ? "✓ Applied in the simulator below" : `Try ${money(move.extra)}/mo in the simulator`}
            </button>
            {move.interestSaved ? (
              <span className="move-save">Saves about <b>{money(move.interestSaved)}</b> in interest</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="move-right">
        <div className="rate">
          <div className="rate-top"><span>Credit card</span><b>{move.cardApr}% APR</b></div>
          <div className="rate-bar"><div className="rate-fill hot" style={{ width: `${(move.cardApr / max) * 100}%` }} /></div>
        </div>
        <div className="rate">
          <div className="rate-top"><span>Toyota auto loan</span><b>{move.loanApr}% APR</b></div>
          <div className="rate-bar"><div className="rate-fill cool" style={{ width: `${(move.loanApr / max) * 100}%` }} /></div>
        </div>
        <div className="rate-gap">{move.spread.toFixed(1)} points more expensive</div>
      </div>
    </section>
  );
}
