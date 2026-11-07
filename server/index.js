import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "100kb" }));

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    geminiKeySet: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    nessieKeySet: Boolean(process.env.NESSIE_API_KEY),
    useNessie: process.env.USE_NESSIE === "true",
  });
});

// AI coach. The browser sends the chat + a text summary of the customer's numbers.
// The secret key stays here on the server and never reaches the browser.
app.post("/api/chat", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "no_key" });

  const { messages, context } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || typeof context !== "string") {
    return res.status(400).json({ error: "bad_request" });
  }

  const systemPrompt = `You are Compass, a warm, plain-spoken financial coach inside a banking app.
Use ONLY the customer's real numbers below. Never invent balances, rates, or products.
Answer in plain English in under 120 words. Give one clear recommendation first, then the why with specific numbers.
No jargon, no long lists, no headings. You may use **bold** for key numbers. This is educational guidance, not licensed financial advice.

${context}`;

  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.text).slice(0, 1000) }],
  }));

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.6 },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      console.error("Gemini error:", r.status, data?.error?.message);
      return res.status(502).json({ error: "gemini_failed" });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
    if (!reply) return res.status(502).json({ error: "empty_reply" });
    res.json({ reply });
  } catch (err) {
    console.error("Gemini request failed:", err.message);
    res.status(502).json({ error: "gemini_unreachable" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Compass API running on http://localhost:${port}`));
