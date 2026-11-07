import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());

// Simple check so we can see the server is alive.
// Later steps add /api/chat (Gemini) and /api/customer (Nessie) here.
app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    geminiKeySet: Boolean(process.env.GEMINI_API_KEY),
    nessieKeySet: Boolean(process.env.NESSIE_API_KEY),
    useNessie: process.env.USE_NESSIE === "true",
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Compass API running on http://localhost:${port}`));
