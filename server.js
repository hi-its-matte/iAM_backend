import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

const MAX_MESSAGES_PER_DAY = 50;

// Stato globale contatore e data di reset
let messageCount = 0;
let lastResetDate = new Date().toISOString().split("T")[0];

// Funzione per resettare contatore a mezzanotte UTC
function resetIfNeeded() {
  const today = new Date().toISOString().split("T")[0];
  if (today !== lastResetDate) {
    messageCount = 0;
    lastResetDate = today;
    console.log(`Contatore messaggi resettato per il giorno: ${today}`);
  }
}

// Endpoint per leggere messaggi rimanenti
app.get("/usage", (req, res) => {
  resetIfNeeded();
  const remaining = Math.max(MAX_MESSAGES_PER_DAY - messageCount, 0);
  res.json({ remaining });
});

// Endpoint chat
app.post("/chat", async (req, res) => {
  resetIfNeeded();

  if (messageCount >= MAX_MESSAGES_PER_DAY) {
    return res.status(429).json({ error: "Limite giornaliero di messaggi raggiunto" });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Nessun messaggio inviato" });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          { role: "system", content: "lingua = Italiano" },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta";

    messageCount++; // Incrementa contatore messaggi usati

    res.json({ reply: botReply, remaining: Math.max(MAX_MESSAGES_PER_DAY - messageCount, 0) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});

