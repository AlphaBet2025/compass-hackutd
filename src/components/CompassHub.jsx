import { useEffect, useRef, useState } from "react";

// ✋ YOUR TURN: the eight "directions" you can steer by. Rename them, change the icons,
// or reorder which panel sits at which heading.
export const SECTIONS = [
  { id: "move", angle: 0, icon: "🧭", label: "Next move", blurb: "Your best next step" },
  { id: "health", angle: 45, icon: "💚", label: "Health", blurb: "Your score, and why" },
  { id: "forecast", angle: 90, icon: "📈", label: "Forecast", blurb: "The next 12 months" },
  { id: "whatif", angle: 135, icon: "🎛️", label: "What if", blurb: "Play with the sliders" },
  { id: "stress", angle: 180, icon: "⛈️", label: "Stress test", blurb: "If your paycheck stopped" },
  { id: "spending", angle: 225, icon: "🧾", label: "Spending", blurb: "Where the money goes" },
  { id: "accounts", angle: 270, icon: "🏦", label: "Accounts", blurb: "Everything you own and owe" },
  { id: "coach", angle: 315, icon: "💬", label: "Coach", blurb: "Ask the AI anything" },
];

const bearing = (a) => `${String(a).padStart(3, "0")}°`;
const R = 39.2; // how far from the centre the buttons sit, in % of the compass size

// The whole app as a compass: pick a heading and the needle swings to it, and that
// section opens on the right.
export default function CompassHub({ selected, onSelect, panels, greeting, stats }) {
  const current = SECTIONS.find((s) => s.id === selected) || SECTIONS[0];

  // The needle keeps a running angle so it always takes the short way round.
  const [needle, setNeedle] = useState(0);
  useEffect(() => {
    setNeedle((prev) => {
      const delta = ((((current.angle - prev) % 360) + 540) % 360) - 180;
      return prev + delta;
    });
  }, [current.angle]);

  // On a phone the panel sits below the compass, so scroll down to it when you pick a heading.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 960px)").matches) {
      document.getElementById("hub-panel-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  return (
    <div className="hub">
      <div className="hub-left">
        <div className="compass">
          <svg className="compass-svg" viewBox="0 0 600 600" aria-hidden="true">
            <circle cx="300" cy="300" r="292" className="c-ring" />
            <circle cx="300" cy="300" r="150" className="c-ring c-faint" />
            <circle cx="300" cy="300" r="90" className="c-ring c-faint" />
            <g className="c-spin">
              <circle cx="300" cy="300" r="268" className="c-ring c-dash" />
              <circle cx="300" cy="300" r="190" className="c-ring c-dash c-faint" />
            </g>
            {Array.from({ length: 72 }, (_, i) => {
              const a = i * 5;
              const long = a % 45 === 0;
              return <line key={a} x1="300" y1="8" x2="300" y2={long ? 32 : a % 15 === 0 ? 24 : 18} className={long ? "c-tick c-tick-long" : "c-tick"} transform={`rotate(${a} 300 300)`} />;
            })}
            <g className="needle" style={{ transform: `rotate(${needle}deg)` }}>
              <g className="needle-wobble">
                <polygon points="300,92 320,300 300,282 280,300" className="n-north" />
                <polygon points="300,508 320,300 300,318 280,300" className="n-south" />
              </g>
            </g>
            <circle cx="300" cy="300" r="13" className="n-pin" />
            <circle cx="300" cy="300" r="4" className="n-dot" />
          </svg>

          {SECTIONS.map((s) => {
            const rad = (s.angle * Math.PI) / 180;
            return (
              <button
                key={s.id}
                className={`hs${selected === s.id ? " on" : ""}`}
                style={{ left: `${50 + R * Math.sin(rad)}%`, top: `${50 - R * Math.cos(rad)}%` }}
                onClick={() => onSelect(s.id)}
                aria-pressed={selected === s.id}
                aria-label={`${s.label}: ${s.blurb}`}
              >
                <span className="ico" aria-hidden="true">{s.icon}</span>
                <span className="lbl">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hub-caption" aria-live="polite">
          <b>{current.label}</b>
          <span>{bearing(current.angle)} · {current.blurb}</span>
        </div>
        <div className="hub-stats">{stats}</div>
      </div>

      <div className="hub-right">
        {greeting}
        <div className="hub-bearing" id="hub-panel-top">Heading {bearing(current.angle)} · {current.label}</div>
        {/* Every panel stays mounted (just hidden), so the chat, stress test and sliders keep their state. */}
        {SECTIONS.map((s) => (
          <div key={s.id} className="hub-panel" hidden={selected !== s.id}>
            {panels[s.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
