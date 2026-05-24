import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { PUJAS_DATA } from "./src/data/pujas";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

const MYSQL_ENABLED = !!process.env.MYSQL_HOST && !!process.env.MYSQL_USER && !!process.env.MYSQL_DATABASE;
let mysqlPool: mysql.Pool | null = null;

async function initMySqlPool() {
  if (!MYSQL_ENABLED) return;
  if (mysqlPool) return;

  try {
    mysqlPool = await mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS json_store (
        collection VARCHAR(100) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("MySQL connection pool initialized successfully.");
  } catch (err) {
    console.error("Error initializing MySQL pool:", err);
  }
}

function getTableName(filename: string) {
  return path.basename(filename, path.extname(filename));
}

async function readDbFile(filename: string, defaultValue: any) {
  if (MYSQL_ENABLED) {
    try {
      await initMySqlPool();
      const tableName = getTableName(filename);
      const [rows] = await mysqlPool!.query<any[]>(
        `SELECT data FROM json_store WHERE collection = ? LIMIT 1`,
        [tableName]
      );
      if (rows.length > 0 && rows[0].data) {
        return JSON.parse(rows[0].data);
      }
      await mysqlPool!.query(
        `INSERT INTO json_store (collection, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [tableName, JSON.stringify(defaultValue)]
      );
      return defaultValue;
    } catch (err) {
      console.error(`MySQL read fallback error for ${filename}:`, err);
    }
  }

  const filePath = path.join(process.cwd(), "db", filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
    } catch (writeErr) {
      console.error(`Error initial writing of ${filename}:`, writeErr);
    }
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading database file ${filename}:`, err);
    return defaultValue;
  }
}

async function writeDbFile(filename: string, data: any) {
  if (MYSQL_ENABLED) {
    try {
      await initMySqlPool();
      const tableName = getTableName(filename);
      await mysqlPool!.query(
        `INSERT INTO json_store (collection, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [tableName, JSON.stringify(data)]
      );
      console.log(`Successfully persisted ${tableName} directly to MySQL.`);
    } catch (err) {
      console.error(`MySQL write error for ${filename}:`, err);
    }
  }

  const filePath = path.join(process.cwd(), "db", filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing file ${filename}:`, err);
  }
}

const DB_DIR = path.join(process.cwd(), "db");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "" || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is missing or invalid.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiClient;
}

// REST APIs
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/settings", async (req, res) => {
  const defaults = {
    contactPhone: '+91 84450 30767',
    whatsappNumber: '+91 84450 30767',
    contactEmail: 'vsvikash290@gmail.com',
    geminiApiKey: '',
    upiId: 'shastri.pandit108@okhdfcbank',
    upiQrUrl: '',
    panditName: 'Shyam Guru ji',
    panditCertification: 'Certified by Mathura Vedic Board',
    panditBio: 'Renowned scholar of Astro-Vedic rituals and Yajnas.',
    showExplorePujasTab: true,
    showAiPanditTab: true,
    showMyBookingsTab: true,
    showAdminPortalTab: true,
    devoteeTerms: '1. All devotion services are verified secure.'
  };
  const settings = await readDbFile("settings.json", defaults);
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  await writeDbFile("settings.json", req.body);
  res.json({ success: true, settings: req.body });
});

app.get("/api/pujas", async (req, res) => {
  const pujas = await readDbFile("pujas.json", PUJAS_DATA);
  res.json(pujas);
});

app.post("/api/pujas", async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Catalog must be an array." });
  }
  await writeDbFile("pujas.json", req.body);
  res.json({ success: true, pujas: req.body });
});

app.get("/api/bookings", async (req, res) => {
  const bookings = await readDbFile("bookings.json", []);
  res.json(bookings);
});

app.post("/api/bookings", async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Bookings must be an array." });
  }
  await writeDbFile("bookings.json", req.body);
  res.json({ success: true, bookings: req.body });
});

app.get("/api/users", async (req, res) => {
  const users = await readDbFile("users.json", []);
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Users list must be an array." });
  }
  await writeDbFile("users.json", req.body);
  res.json({ success: true, users: req.body });
});

// AI Chatbot
app.post("/api/chat", async (req, res) => {
  const { messages, customApiKey, language, panditName, panditCertification, panditBio } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const name = panditName || "Shyam Guru ji";
  const lang = language || "multilingual";

  const customInstruction = `You are "${name}". Reply in setting: ${lang}. Keep answers elegant and brief (2-3 short paragraphs).`;

  try {
    let ai = (customApiKey && customApiKey.trim() !== "") ? new GoogleGenAI({ apiKey: customApiKey }) : getGeminiClient();
    const formattedHistory = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: { systemInstruction: customInstruction, temperature: 0.7 },
    });

    res.json({ text: response.text || "Pranam. Let me meditate and reply shortly." });
  } catch (error: any) {
    console.error("Gemini failure:", error);
    res.json({ text: "Pranam. A brief spiritual pause has occurred. How can I guide you today?", fallback: true });
  }
});

// Init Server Bundle
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pooja4Panditji server running on port ${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Error launching server:", err);
});