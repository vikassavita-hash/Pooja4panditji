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
  if (!MYSQL_ENABLED) {
    return;
  }

  if (mysqlPool) {
    return;
  }

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
    console.error(`Error reading database file ${filename}, fallback value used:`, err);
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
      return;
    } catch (err) {
      console.error(`MySQL write fallback error for ${filename}:`, err);
    }
  }

  const filePath = path.join(process.cwd(), "db", filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error persisting database file ${filename}:`, err);
  }
}

const DB_DIR = path.join(process.cwd(), "db");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Safe Lazy Initialization for Google GenAI on the secure server side
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      throw new Error("GEMINI_API_KEY is not defined or is a placeholder in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// System Persona instructions for Pandit Shastri Dev Ji
const PANDIT_SYSTEM_INSTRUCTION = `
You are "Pandit Shastri Dev Ji", a highly revered, compassionate, and wise Vedic priest, Sanskrit scholar, and spiritual guide.
You are the spiritual advisor for "Pooja4Panditji", a highly respected online platform for booking authentic Pujas, Havans, and rituals.
Your mission is to guide devotees respectfully, offer compassionate counsel, explain complex ritual symbols simple, and assist they in identifying the right Puja.

Key Professional Directives:
1. Tone: Always speak in a warm, humble, reassuring, and highly respectful tone. Use classical Vedic greetings such as "Peace be upon you", "Om Namah Shivaya", "Namaste", or "Pranam dear devotee" at the top of your reply, but maintain high conversational elegance without sounding robotic.
2. Catalog Mapping: We offer 5 core pujas. If a devotee describes a problem, select and explain the most relevant offering from:
   - "Sri Satyanarayan Puja" for overall family peace, prosperity, resolving home disharmony, gratitude, or child milestones.
   - "Griha Pravesh Puja" for housewarmings, neutralizing architectural/Vastu defects, or entering new environments.
   - "Maha Rudrabhishek Puja" for appeasing Lord Shiva, planetary alignment resets (e.g. Shani/Rahu dosha), internal mental stillness, and overcoming blocks.
   - "Ganesh-Lakshmi Business Puja" for shop inaugurations, industrial growth, clearing debts, or audit cycles.
   - "Maha Mrityunjaya Healing Jaap" for recovering sick family members, physical shields before surgery, chronic ailments, and ancestral longevity prayers.
3. Samagri Wisdom: Discuss materials lovingly (e.g., coconut representing human ego being broken to offer sweet purity, ghee representing clarify of intellect, darbha grass, bael leaves, turmeric, gangajal etc.). Guide them that if they book in-person standard/premium, we ship the complete samagri kit.
4. Philosophical Realism: Remind them humbleness. Rituals are devotional avenues to realign inner and outer energies; we do not sell magic cures, commercial success is the harvest of righteous hard work and divine grace.
5. Format: Keep replies extremely clear, elegant, utilizing paragraphs and neat bullet points for samagri or benefits. Keep answers around 2-3 short, scannable paragraphs. Do not write extremely long text.
`;

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Settings REST APIs
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
    panditBio: 'Renowned scholar of Astro-Vedic rituals and Yajnas, directly descended from traditional priestly line of Mathura. Specialist in dynamic Kundali matchmaking and Shubh Muhurat determinations.',
    showExplorePujasTab: true,
    showAiPanditTab: true,
    showMyBookingsTab: true,
    showAdminPortalTab: true,
    devoteeTerms: '1. All devotion services (Shradha Dakshina) are verified secure.\n2. The simulated handshakes are for instructional, direct, offline and virtual connect.\n3. By booking any puja, the devotee agrees to provide accurate Birth coordinates, Gothra and Nakshatra.\n4. Standard 24 Hours validity applies to digital chatbot and voice consult channels.\n5. Vedic rituals represent deep lineage devotion.'
  };
  const settings = await readDbFile("settings.json", defaults);
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  const newSettings = req.body;
  await writeDbFile("settings.json", newSettings);
  res.json({ success: true, settings: newSettings });
});

// Catalog Pujas REST APIs
app.get("/api/pujas", async (req, res) => {
  const pujas = await readDbFile("pujas.json", PUJAS_DATA);
  res.json(pujas);
});

app.post("/api/pujas", async (req, res) => {
  const newPujas = req.body;
  if (!Array.isArray(newPujas)) {
    return res.status(400).json({ error: "Catalog must be an array." });
  }
  await writeDbFile("pujas.json", newPujas);
  res.json({ success: true, pujas: newPujas });
});

// Bookings REST APIs
app.get("/api/bookings", async (req, res) => {
  const defaults = [
    {
      id: 'BKG-9843-VEDA',
      pujaId: 'satyanarayan',
      pujaName: 'Sri Satyanarayan Puja',
      pujaImage: 'https://images.unsplash.com/photo-1609137144814-6330bf4cb51b?auto=format&fit=crop&q=80&w=600',
      customerName: 'Vikas Savita',
      customerPhone: '+91 98765 43210',
      customerEmail: 'vikas.savita@smollan.com',
      gothra: 'Bhardwaj',
      nakshatra: 'Rohini',
      sankalpNames: 'Vikas Savita & Family',
      mode: 'e-puja',
      dateTime: '2026-06-15T09:30',
      language: 'Sanskrit & Hindi',
      packageId: 'basic',
      packageName: 'Katha & Sankalp (E-Puja)',
      price: 2100,
      includeSamagriKit: false,
      status: 'confirmed',
      paymentId: 'PAY-STN-89473-OK',
      paymentMethod: 'UPI (GPay)',
      meetingLink: 'https://meet.google.com/ais-veda-satya',
      transactionDateTime: '2026-05-22T12:00:00Z',
      otpVerified: true,
      notes: "Please pray for my mother's speedy recovery."
    }
  ];
  const bookings = await readDbFile("bookings.json", defaults);
  res.json(bookings);
});

app.post("/api/bookings", async (req, res) => {
  const newBookings = req.body;
  if (!Array.isArray(newBookings)) {
    return res.status(400).json({ error: "Bookings must be an array." });
  }
  await writeDbFile("bookings.json", newBookings);
  res.json({ success: true, bookings: newBookings });
});

// Users REST APIs
app.get("/api/users", async (req, res) => {
  const defaults = [
    {
      userId: 'vikas.savita@smollan.com',
      passwordHash: 'password123',
      fullName: 'Vikas Savita',
      phone: '+91 98765 43210',
      email: 'vikas.savita@smollan.com',
      gothra: 'Bhardwaj',
      nakshatra: 'Rohini',
      createdAt: '2026-05-18T10:00:00Z'
    }
  ];
  const users = await readDbFile("users.json", defaults);
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const newUsers = req.body;
  if (!Array.isArray(newUsers)) {
    return res.status(400).json({ error: "Users list must be an array." });
  }
  await writeDbFile("users.json", newUsers);
  res.json({ success: true, users: newUsers });
});

// Secular simulated data for booking validations if needed at the backend
app.post("/api/chat", async (req, res) => {
  const { messages, customApiKey, language, panditName, panditCertification, panditBio } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const name = panditName || "Shyam Guru ji";
  const cert = panditCertification || "Certified by Mathura Vedic Board";
  const bio = panditBio || "Renowned scholar of Astro-Vedic rituals and Yajnas, directly descended from traditional priestly line of Mathura. Specialist in dynamic Kundali matchmaking and Shubh Muhurat determinations.";
  const lang = language || "multilingual";

  const customInstruction = `
You are "${name}", a highly revered, compassionate, and wise Vedic priest, Sanskrit scholar, and spiritual guide.
You are "${cert}".
Your biography: ${bio}.
You are the spiritual advisor for "Pooja4Panditji", a highly respected online platform for booking authentic Pujas, Havans, and rituals.
Your mission is to guide devotees respectfully, offer compassionate counsel, explain complex ritual symbols simply, and assist them in identifying the right Puja.

Key Professional Directives:
1. Tone: Always speak in a warm, humble, reassuring, and highly respectful tone. Use classical Vedic greetings such as "Peace be upon you", "Om Namah Shivaya", "Namaste", or "Pranam dear devotee" at the top of your reply, but maintain high conversational elegance.
2. Language: The devotee has requested you to reply in language setting: ${lang}. Ensure you respond in this language or naturally follow the devotee's language preference (e.g. English, Hindi, Sanskrit, Regional, etc.). If lang is 'multilingual' or 'Hinglish', communicate in a mixture of Hindi, English, and Sanskrit that is easy to understand.
3. Catalog Mapping: We offer 5 core pujas. If a devotee describes a problem, select and explain the most relevant offering from:
   - "Sri Satyanarayan Puja" for overall family peace, prosperity, resolving home disharmony, gratitude, or child milestones.
   - "Griha Pravesh Puja" for housewarmings, neutralizing architectural/Vastu defects, or entering new environments.
   - "Maha Rudrabhishek Puja" for appeasing Lord Shiva, planetary alignment resets (e.g. Shani/Rahu dosha), internal mental stillness, and overcoming blocks.
   - "Ganesh-Lakshmi Business Puja" for shop inaugurations, industrial growth, clearing debts, or audit cycles.
   - "Maha Mrityunjaya Healing Jaap" for recovering sick family members, physical shields before surgery, chronic ailments, and ancestral longevity prayers.
4. Samagri Wisdom: Discuss materials lovingly (e.g., coconut representing human ego being broken to offer sweet purity, ghee representing clarity of intellect, darbha grass, bael leaves, turmeric, gangajal etc.).
5. Philosophical Realism: Remind them that rituals are devotional avenues to realign inner and outer energies; we do not sell magic cures.
6. Format: Keep replies extremely clear, elegant, utilizing paragraphs and neat bullet points for samagri or benefits. Keep answers around 2-3 short, scannable paragraphs. Do not write extremely long text.
`;

  try {
    let ai: GoogleGenAI;
    if (customApiKey && customApiKey.trim() !== "" && !customApiKey.startsWith("placeholder")) {
      ai = new GoogleGenAI({
        apiKey: customApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-custom',
          }
        }
      });
    } else {
      ai = getGeminiClient();
    }

    // Map the incoming client message format into @google/genai contents list
    const formattedHistory = messages.map((msg: any) => {
      return {
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction: customInstruction,
        temperature: 0.7,
      },
    });

    const responseText = response.text || `Pranam. I am ${name}. Connecting to cosmic energy, let me meditate and reply shortly.`;
    res.json({ text: responseText });

  } catch (error: any) {
    console.error("Gemini server-side broker failure:", error);
    
    // Graceful degradation when the API key is not present or is placeholder, matching security goals
    let fallbackText = `Pranam. I am ${name}. Seeking your spiritual peace. `;
    
    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      fallbackText += "The divine network requires setup. Please make sure to add your GEMINI_API_KEY in the Secrets panel of AI Studio so I can connect deep Vedic intelligence for you! Let me know if you would like me to discuss Sri Satyanarayan, Rudrabhishek or Griha Pravesh essentials anyway.";
    } else {
      fallbackText += "A brief spiritual pause has occurred. Let us focus our minds on Lord Ganesha. How can I guide you on your puja selection and Veda arrangements today?";
    }
    
    res.json({ text: fallbackText, fallback: true });
  }
});

// Configure Vite or Static Assets handling
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
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
