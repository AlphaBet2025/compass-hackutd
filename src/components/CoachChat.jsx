import { useEffect, useRef, useState } from "react";
import { offlineAnswer, offlinePlan, movePlan, asksToApply } from "../lib/nextMove.js";
import { money } from "../lib/health.js";
import { DEFAULT_ADJUST } from "../lib/forecast.js";

// ✋ YOUR TURN: change these starter questions to whatever you want to demo.
const SUGGESTIONS = [
  "Should I pay my card or my car loan first?",
  "How am I doing overall?",
  "How can I build my emergency fund?",
  "Where can I cut spending?",
];

// Tiny formatter: turns **bold** into <strong>.
function Text({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

const planText = (p) =>
  p.summary ||
  [
    p.diningCut && `cut dining ${p.diningCut}%`,
    p.groceriesCut && `cut groceries ${p.groceriesCut}%`,
    p.transportCut && `cut transport ${p.transportCut}%`,
    p.otherCut && `cut shopping ${p.otherCut}%`,
    p.extraCard && `+${money(p.extraCard)}/mo on the card`,
    p.extraLoan && `+${money(p.extraLoan)}/mo on the Toyota loan`,
    p.incomeChange && `income ${p.incomeChange > 0 ? "+" : ""}${p.incomeChange}%`,
  ]
    .filter(Boolean)
    .join(", ");

const samePlan = (p, a) => Object.keys(DEFAULT_ADJUST).every((k) => (p[k] || 0) === (a[k] || 0));

export default function CoachChat({ customer, context, adjust, onApplyPlan, externalQuestion, onExternalHandled }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi ${customer.name.split(" ")[0]}! I'm your Compass coach. I can see all your accounts. Ask me anything about your money.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  // A plan to show under the coach's reply. If the AI didn't attach one, we add the app's own
  // recommended plan when the question is about paying debt, and re-offer the last plan when
  // the customer says "apply it".
  const planFor = (question, history) => {
    const last = [...history].reverse().find((m) => m.role === "assistant" && m.plan)?.plan || null;
    if (asksToApply(question)) return last || movePlan(customer);
    if (/card|car\b|loan|toyota|first|pay off|debt|faster|extra/i.test(question)) return movePlan(customer);
    return null;
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Another card (like the stress test) can send the coach a question.
  useEffect(() => {
    if (externalQuestion) {
      send(externalQuestion.text);
      onExternalHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuestion?.id]);

  async function send(text) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setBusy(true);

    // If the AI is slow (bad Wi-Fi, busy API), stop waiting after 10 seconds and answer offline.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      // Skip the greeting: Gemini wants the conversation to start with the user.
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => i > 0 && !m.offline), context }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || "failed");
      setMessages([...next, { role: "assistant", text: data.reply, plan: data.plan || planFor(question, next) }]);
    } catch {
      // Friendly fallback: answer from the same numbers without the AI.
      setMessages([
        ...next,
        { role: "assistant", offline: true, text: offlineAnswer(question, customer, adjust), plan: planFor(question, next) || offlinePlan(question, customer) },
      ]);
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <section className="card coach" id="coach">
      <div className="card-head">
        <h2>Ask your coach</h2>
        <span className="muted small">Powered by Gemini · reads your real numbers</span>
      </div>

      <div className="chat" ref={listRef} role="log" aria-live="polite" aria-label="Conversation with your coach">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              <Text text={m.text} />
              {m.plan && (
                <div className="plan">
                  <div className="plan-label">Suggested plan</div>
                  <div className="plan-text">{planText(m.plan)}</div>
                  <button className="btn" disabled={samePlan(m.plan, adjust)} onClick={() => onApplyPlan(m.plan)}>
                    {samePlan(m.plan, adjust) ? "✓ Applied. See the forecast above" : "Apply this plan"}
                  </button>
                </div>
              )}
              {m.offline && <div className="offline-note">Quick answer (the AI is unavailable right now)</div>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input aria-label="Ask your coach a question" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your money…" />
        <button className="btn" disabled={busy || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
