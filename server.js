import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

import admin from "firebase-admin";

// Legge il JSON delle credenziali da variabile d'ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Inizializza Firebase Admin SDK con le credenziali
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // eventualmente altre config come databaseURL se serve
});


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware per controllare che la richiesta abbia un token valido Firebase
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token mancante o non valido" });
  }
  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // dati utente disponibili qui
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token Firebase non valido" });
  }
}

// Proteggi la rotta /chat con autenticazione Firebase
app.post("/chat", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Nessun messaggio inviato" });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
    res.json({ reply: botReply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
