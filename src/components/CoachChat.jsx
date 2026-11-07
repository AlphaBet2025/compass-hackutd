import { useEffect, useRef, useState } from "react";
import { offlineAnswer } from "../lib/nextMove.js";

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

export default function CoachChat({ customer, context, adjust }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi ${customer.name.split(" ")[0]}! I'm your Compass coach. I can see all your accounts. Ask me anything about your money.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      // Skip the greeting: Gemini wants the conversation to start with the user.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => i > 0 && !m.offline), context }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || "failed");
      setMessages([...next, { role: "assistant", text: data.reply }]);
    } catch {
      // Friendly fallback: answer from the same numbers without the AI.
      setMessages([...next, { role: "assistant", offline: true, text: offlineAnswer(question, customer, adjust) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card coach">
      <div className="card-head">
        <h2>Ask your coach</h2>
        <span className="muted small">Powered by Gemini · reads your real numbers</span>
      </div>

      <div className="chat" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              <Text text={m.text} />
              {m.offline && <div className="offline-note">Quick answer (AI is offline right now)</div>}
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
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your money…" />
        <button className="btn" disabled={busy || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
