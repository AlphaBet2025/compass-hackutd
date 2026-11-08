import "dotenv/config";
import express from "express";
import { loadCustomerFromNessie } from "./nessie.js";
import { SLIDERS } from "../src/data/simulatorConfig.js";
import { getPerson } from "../src/data/customers.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    geminiKeySet: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    nessieKeySet: Boolean(process.env.NESSIE_API_KEY),
    useNessie: process.env.USE_NESSIE === "true",
  });
});

// The customer the app shows. Nessie when USE_NESSIE=true, otherwise (or if
// Nessie is down) the built-in demo customer, so the demo never breaks.
app.get("/api/customer", async (req, res) => {
  // Any of the three sample customers can come live from Nessie (if it's switched on).
  const id = getPerson(String(req.query.id || "jordan")).id;

  if (process.env.USE_NESSIE === "true") {
    try {
      const slow = new Promise((_, reject) => setTimeout(() => reject(new Error("Nessie took too long")), 7000));
      return res.json({ source: "nessie", customer: await Promise.race([loadCustomerFromNessie(id), slow]) });
    } catch (err) {
      console.error("Nessie failed, using demo data:", err.message);
      return res.json({ source: "demo", reason: "nessie_unavailable", customer: getPerson(id).data });
    }
  }
  res.json({ source: "demo", customer: getPerson(id).data });
});

// Never trust the model's numbers: snap them to the real slider ranges and steps.
function cleanPlan(p) {
  if (!p || typeof p !== "object") return null;
  const out = {};
  for (const sl of SLIDERS) {
    const n = Number(p[sl.key]) || 0;
    out[sl.key] = Math.min(sl.max, Math.max(sl.min, Math.round(n / sl.step) * sl.step));
  }
  if (!SLIDERS.some((sl) => out[sl.key] !== 0)) return null;
  out.summary = String(p.summary || "").slice(0, 120);
  return out;
}

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

You reply as JSON: {"reply": "...", "plan": {...} or null}.
The app has seven what-if sliders: diningCut (0-100), groceriesCut (0-40), transportCut (0-40), otherCut (0-100) are percent cuts to that spending line; extraCard (0-1000) is extra dollars per month on the credit card; extraLoan (0-1000) is extra dollars per month on the Toyota auto loan; incomeChange (-30 to 30) is percent.
Whenever your reply recommends a concrete action the sliders can model (for example an extra monthly payment on the card or the Toyota loan, or cutting a spending line), you MUST also include a "plan" with exactly those numbers, matching the dollar amounts in your reply. Do this when the customer asks what to do, how to reach a goal, or to try something. ALSO include a "plan" that sets those sliders (whole numbers, only what's needed, others 0) and a short "summary" like "Cut dining 25% and add $300/month to the card". Make sure the plan is affordable from their monthly leftover. If the customer asks you to apply, set up or do the plan you just recommended, repeat that same plan in "plan" and tell them to press the Apply button. For plain questions, explanations or small talk, set plan to null.

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
          generationConfig: {
            temperature: 0.6,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                reply: { type: "STRING" },
                plan: {
                  type: "OBJECT",
                  nullable: true,
                  properties: {
                    diningCut: { type: "INTEGER" },
                    groceriesCut: { type: "INTEGER" },
                    transportCut: { type: "INTEGER" },
                    otherCut: { type: "INTEGER" },
                    extraCard: { type: "INTEGER" },
                    extraLoan: { type: "INTEGER" },
                    incomeChange: { type: "INTEGER" },
                    summary: { type: "STRING" },
                  },
                },
              },
              required: ["reply"],
            },
          },
        }),
        signal: AbortSignal.timeout(11000), // the page gives up at 10s and shows its offline answer
      }
    );
    const data = await r.json();
    if (!r.ok) {
      console.error("Gemini error:", r.status, data?.error?.message);
      return res.status(502).json({ error: "gemini_failed" });
    }
    const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
    if (!raw) return res.status(502).json({ error: "empty_reply" });

    let reply = raw;
    let plan = null;
    try {
      const parsed = JSON.parse(raw);
      reply = String(parsed.reply || "").trim();
      plan = cleanPlan(parsed.plan);
    } catch {
      /* the model sent plain text, so just show it */
    }
    if (!reply) return res.status(502).json({ error: "empty_reply" });
    res.json({ reply, plan });
  } catch (err) {
    console.error("Gemini request failed:", err.message);
    res.status(502).json({ error: "gemini_unreachable" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Compass API running on http://localhost:${port}`));
