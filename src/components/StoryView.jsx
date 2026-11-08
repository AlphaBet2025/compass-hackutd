import { useEffect, useRef, useState } from "react";
import { money } from "../lib/health.js";

// A number that counts up when its scene scrolls into view.
function CountUp({ to, active, duration = 1500 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf, t0;
    const tick = (t) => {
      t0 ??= t;
      const p = Math.min((t - t0) / duration, 1);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return <>{money(v)}</>;
}

// The whole app as one long scroll: each full-screen scene tells one part of the story.
export default function StoryView({ first, totals, health, move, run, panels }) {
  const refs = useRef({});
  const [seen, setSeen] = useState({ hero: true });
  const [active, setActive] = useState("hero");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // reveal a scene (once) when it comes into view
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen((s) => (s[e.target.dataset.id] ? s : { ...s, [e.target.dataset.id]: true }))),
      { threshold: 0.18 }
    );
    // the dot that's lit is the scene crossing the middle of the screen
    const current = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.dataset.id)),
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    Object.values(refs.current).forEach((el) => { if (el) { reveal.observe(el); current.observe(el); } });

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { reveal.disconnect(); current.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  // ✋ YOUR TURN: the story. Each scene has a small label, a big headline and a line of text.
  const scenes = [
    { id: "accounts", label: "Where you stand", kicker: "01 · Where you stand", title: <>Everything you own,<br />and everything you owe.</>, text: `${money(totals.assets)} in assets, ${money(totals.debts)} in debt. That's a net worth of ${money(totals.netWorth)}.`, content: panels.accounts },
    { id: "health", label: "How healthy", kicker: "02 · How healthy it is", title: <>A score of {health.score}.<br />Here's why.</>, text: "Four things decide it: your cushion, your credit card use, your debt load, and how much you keep each month.", content: panels.health },
    { id: "move", label: "The move", kicker: "03 · The move", title: move.headline, text: move.why, content: panels.move },
    { id: "whatif", label: "The future", kicker: "04 · The future", title: <>Drag it.<br />Watch the next 12 months change.</>, text: "Cut something, add a payment, change your income. The forecast and your score react instantly.", content: panels.whatif },
    { id: "stress", label: "The storm", kicker: "05 · The storm", title: <>And if the paycheck stopped?</>, text: `You'd last about ${run.nowMonths.toFixed(1)} months today. Here's how to stretch it, and where the money goes now.`, content: <div className="hub-stack">{panels.stress}{panels.spending}</div> },
    { id: "coach", label: "Ask", kicker: "06 · Ask", title: <>Ask anything.<br />It already knows your numbers.</>, text: "A Gemini-powered coach that reads your real accounts, and can turn its advice into a plan you can apply.", content: panels.coach },
  ];
  const nav = [{ id: "hero", label: "Start" }, ...scenes];

  const go = (id) => document.getElementById(`scene-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="story">
      <div className="progress" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <nav className="dots" aria-label="Story sections">
        {nav.map((s) => (
          <button key={s.id} onClick={() => go(s.id)} aria-label={s.label} aria-current={active === s.id} title={s.label} />
        ))}
      </nav>

      <section id="scene-hero" data-id="hero" ref={(el) => (refs.current.hero = el)} className="scene hero-scene in">
        <svg className="sv-compass" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="96" className="sv-ring" />
          <circle cx="100" cy="100" r="80" className="sv-ring sv-dash" />
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="100" y1="4" x2="100" y2={i % 9 === 0 ? 17 : 10} className="sv-tick" transform={`rotate(${i * 5} 100 100)`} />
          ))}
          <g className="sv-needle">
            <polygon points="100,26 110,100 100,92 90,100" className="sv-n" />
            <polygon points="100,174 110,100 100,108 90,100" className="sv-s" />
          </g>
          <circle cx="100" cy="100" r="5" className="sv-pin" />
        </svg>
        <div className="scene-inner hero-inner">
          <div>
            <div className="sc-kicker">Compass · your financial co-pilot</div>
            <h1 className="sc-title hero-title">Good to see you,<br />{first}.</h1>
            <div className="hero-label">Your net worth today</div>
            <div className="hero-number"><CountUp to={totals.netWorth} active /></div>
            <p className="sc-text">
              Here's your money's story, and the one thing worth doing about it. Scroll down.
            </p>
            <div className="chev" aria-hidden="true">↓</div>
          </div>
        </div>
      </section>

      {scenes.map((s) => (
        <section key={s.id} id={`scene-${s.id}`} data-id={s.id} ref={(el) => (refs.current[s.id] = el)} className={`scene${seen[s.id] ? " in" : ""}`}>
          <div className="scene-inner">
            <div>
              <div className="sc-kicker reveal">{s.kicker}</div>
              <h2 className="sc-title reveal d1">{s.title}</h2>
              <p className="sc-text reveal d2">{s.text}</p>
            </div>
            <div className="sc-content reveal d2">{s.content}</div>
          </div>
        </section>
      ))}
    </div>
  );
}
