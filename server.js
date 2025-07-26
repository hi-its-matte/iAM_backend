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

// Stato globale contatore messaggi e data ultimo reset (in memoria)
let dailyCount = 0;
let lastResetDate = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'

// Funzione per resettare il contatore se è passato un nuovo giorno UTC
function resetCounterIfNeeded() {
  const today = new Date().toISOString().split("T")[0];
  if (today !== lastResetDate) {
    dailyCount = 0;
    lastResetDate = today;
    console.log(`Contatore messaggi resettato per il giorno ${today}`);
  }
}

app.post("/chat", async (req, res) => {
  resetCounterIfNeeded();

  // Controlla se siamo oltre il limite di 50 messaggi
  if (dailyCount >= 50) {
    return res.status(429).json({ error: "Limite massimo di 50 messaggi giornalieri raggiunto. Riprova domani." });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Nessun messaggio inviato" });

    // Esegui la chiamata API al modello
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          { role: "system", content: "lingua = Italiano" },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta";

    dailyCount++; // Incrementa il contatore globale

    res.json({ reply: botReply, remaining: 50 - dailyCount });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});

app.use(express.static("public"));
