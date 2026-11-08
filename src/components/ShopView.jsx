import { useEffect, useState } from "react";
import { SLIDERS } from "../data/simulatorConfig.js";
import { DEFAULT_ADJUST } from "../lib/forecast.js";
import { money } from "../lib/health.js";

// ✋ YOUR TURN: the "products". Each one is really one of Compass's features,
// dressed up as something on a shelf. Rename them and rewrite the pitches in your own voice.
const PRODUCTS = [
  { id: "move", icon: "🧭", name: "The Next Move", aisle: "Aisle 1 · Decisions", pitch: "One clear step, with the numbers to back it up.", badge: "BEST SELLER", tint: "#ffd9dc" },
  { id: "health", icon: "💚", name: "Health Check", aisle: "Aisle 1 · Decisions", pitch: "A 0–100 score, and exactly what's behind it.", tint: "#d4f5e2" },
  { id: "forecast", icon: "📈", name: "The Crystal Ball", aisle: "Aisle 2 · The future", pitch: "See your money 12 months from now.", tint: "#dbe7ff" },
  { id: "whatif", icon: "🎛️", name: "What-If Machine", aisle: "Aisle 2 · The future", pitch: "Slide things around. Watch the future change.", badge: "INTERACTIVE", tint: "#fff0c2" },
  { id: "stress", icon: "⛈️", name: "Storm Shelter", aisle: "Aisle 3 · Safety", pitch: "How long could you last without a paycheck?", tint: "#e3dcff" },
  { id: "spending", icon: "🧾", name: "Receipt Reader", aisle: "Aisle 3 · Safety", pitch: "Where your money actually goes, merchant by merchant.", tint: "#ffe3cf" },
  { id: "accounts", icon: "🏦", name: "The Vault", aisle: "Aisle 4 · Basics", pitch: "Everything you own and everything you owe.", tint: "#d9f1f5" },
  { id: "coach", icon: "💬", name: "Ask the Coach", aisle: "Aisle 4 · Basics", pitch: "A Gemini-powered coach that reads your real numbers.", badge: "AI", tint: "#ffd9f0" },
];

const lineText = (s, v) => {
  if (s.key === "extraCard" || s.key === "extraLoan") return `+${money(v)}/mo`;
  if (s.key === "incomeChange") return `${v > 0 ? "+" : "−"}${Math.abs(v)}%`;
  return `−${v}%`;
};

// The whole app as a shop. Every feature is a product on a shelf; click one to open its page.
// Your "cart" is your what-if plan: every slider you move becomes a line in it.
export default function ShopView({ first, panels, stats, selected, open, onOpen, onClose, adjust, setAdjust, scenario, baseline }) {
  const [cartOpen, setCartOpen] = useState(false);
  const product = PRODUCTS.find((p) => p.id === selected) || PRODUCTS[0];

  const lines = SLIDERS.filter((s) => (adjust[s.key] || 0) !== 0).map((s) => ({ label: s.label, text: lineText(s, adjust[s.key]) }));
  const gain = scenario.end.netWorth - baseline.end.netWorth;

  // Close the product page with Escape, and stop the page behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <div className="shop">
      <div className="awning" aria-hidden="true" />

      <header className="shop-head">
        <div>
          <div className="shop-eyebrow">Open today · Everything is free</div>
          <h1>Compass Market</h1>
          <p>Welcome in, {first}. Your money, on the shelf. Pick something up.</p>
        </div>

        <div className="cart-wrap">
          <button className="cart-btn" onClick={() => setCartOpen(!cartOpen)} aria-expanded={cartOpen}>
            <span aria-hidden="true">🛒</span> Your plan <b>{lines.length}</b>
          </button>
          {cartOpen && (
            <div className="cart" role="dialog" aria-label="Your plan">
              <div className="cart-title">Your plan (the what-if cart)</div>
              {lines.length === 0 ? (
                <p className="muted small">Empty. Open the What-If Machine, or take the Next Move, to put something in.</p>
              ) : (
                <ul>
                  {lines.map((l) => (
                    <li key={l.label}><span>{l.label}</span><b>{l.text}</b></li>
                  ))}
                </ul>
              )}
              <div className="cart-total">
                <div><span>Left over each month</span><b>{money(Math.max(scenario.monthlySurplus, 0))}</b></div>
                <div><span>12-month net worth vs. no changes</span><b className={gain >= 0 ? "up" : "down"}>{gain >= 0 ? "+" : "−"}{money(Math.abs(gain))}</b></div>
              </div>
              <div className="cart-actions">
                <button className="btn" onClick={() => { setCartOpen(false); onOpen("whatif"); }}>Edit plan</button>
                {lines.length > 0 && <button className="link-btn" onClick={() => setAdjust(DEFAULT_ADJUST)}>Empty cart</button>}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="shelf">
        {PRODUCTS.map((p) => (
          <button key={p.id} className="prod" onClick={() => onOpen(p.id)} aria-label={`${p.name}: ${p.pitch}`}>
            <span className="price" aria-hidden="true"><b>$0</b><small>free</small></span>
            <span className="prod-art" style={{ background: p.tint }} aria-hidden="true">{p.icon}</span>
            {p.badge && <span className="prod-badge">{p.badge}</span>}
            <span className="prod-aisle">{p.aisle}</span>
            <span className="prod-name">{p.name}</span>
            <span className="prod-pitch">{p.pitch}</span>
            <span className="prod-stat">{stats[p.id]}</span>
            <span className="prod-go">Take a look →</span>
          </button>
        ))}
      </div>

      {/* The product page. Every page stays mounted (just hidden) so your chat and sliders keep their state. */}
      <div className="shop-overlay" hidden={!open} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="shop-modal" role="dialog" aria-modal="true" aria-label={product.name}>
          <div className="modal-head">
            <span className="modal-art" style={{ background: product.tint }} aria-hidden="true">{product.icon}</span>
            <div>
              <div className="prod-aisle">{product.aisle}</div>
              <h2>{product.name}</h2>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="modal-body">
            {PRODUCTS.map((p) => (
              <div key={p.id} hidden={selected !== p.id}>{panels[p.id]}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
