// ✋ YOUR TURN: this is the logo, a compass with a needle. Swap in your own design if you like.
export default function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" role="img" aria-label="Compass logo">
      <circle cx="16" cy="16" r="14" fill="rgba(255,255,255,0.14)" stroke="#fff" strokeWidth="2" />
      <polygon points="16,5 20,16 16,14 12,16" fill="#ff7a82" />
      <polygon points="16,27 12,16 16,18 20,16" fill="#fff" />
      <circle cx="16" cy="16" r="1.8" fill="#10203f" />
    </svg>
  );
}
