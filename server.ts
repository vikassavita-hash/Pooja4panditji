import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createPool, Pool, PoolConnection } from "mysql2/promise";
import { PUJAS_DATA } from "./src/data/pujas";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const PORT = 3000;

// Setup persistent JSON file-based database fallback
const DB_DIR = path.join(process.cwd(), "db");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Setup dedicated uploads folder inside public-accessible database directory
const UPLOADS_DIR = path.join(DB_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

// Parse Connection string intelligently prioritizing Public TCP proxy handles if running outside cluster
const RAW_URL = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL || "";

function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get("ssl") || parsed.searchParams.get("sslmode") || parsed.searchParams.get("tls");
    const sslEnabled = sslMode === "true" || sslMode === "require" || sslMode === "verify_ca" || sslMode === "verify_identity" || parsed.protocol === "mysqls:";
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "3306", 10),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname?.slice(1) || "railway",
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
    };
  } catch (e) {
    // Graceful fallback to individual env parameters
    const sslEnabled = process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1";
    return {
      host: process.env.MYSQLHOST || "localhost",
      port: parseInt(process.env.MYSQLPORT || "3306", 10),
      user: process.env.MYSQLUSER || "root",
      password: process.env.MYSQLPASSWORD || "",
      database: process.env.MYSQLDATABASE || "railway",
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
    };
  }
}

const MYSQL_CONFIG = parseDatabaseUrl(RAW_URL);

// Build the engine pool with explicit MySQL 8 auth and keep-alive configuration flags
const MYSQL_POOL: Pool | null = createPool({
  host: MYSQL_CONFIG.host,
  user: MYSQL_CONFIG.user,
  password: MYSQL_CONFIG.password,
  database: MYSQL_CONFIG.database,
  port: MYSQL_CONFIG.port,
  ssl: MYSQL_CONFIG.ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  allowPublicKeyRetrieval: true // Essential fix for Railway MySQL 8 environments
} as any);

let mysqlReady = false;

async function ensureMysqlConnected() {
  if (!MYSQL_POOL) return false;
  try {
    if (!mysqlReady) {
      console.log(`[MySQL] Attempting connection to target host: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`);
    }
    const conn = await MYSQL_POOL.getConnection();
    try {
      await conn.ping();
      if (!mysqlReady) {
        await ensureMysqlTables(conn);
        mysqlReady = true;
        console.log(`[MySQL] Connected successfully to target host: ${MYSQL_CONFIG.host}`);
      }
      return true;
    } finally {
      conn.release();
    }
  } catch (err) {
    mysqlReady = false;
    console.error("[MySQL] Connection dropped or failed, using local file-system fallbacks:", err);
    return false;
  }
}

async function ensureMysqlTables(conn: PoolConnection) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      value JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS pujas (
      id VARCHAR(255) PRIMARY KEY,
      data JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(255) PRIMARY KEY,
      data JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      userId VARCHAR(255) PRIMARY KEY,
      data JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id VARCHAR(255) PRIMARY KEY,
      data JSON NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

function safeParseJson(value: any) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function mysqlGetSettings(defaults: any) {
  if (!(await ensureMysqlConnected())) return readDbFile("settings.json", defaults);
  try {
    const [rows]: any = await MYSQL_POOL!.query(`SELECT value FROM settings WHERE id = 1 LIMIT 1`);
    const record = rows[0];
    if (record?.value) {
      return safeParseJson(record.value);
    }
    await MYSQL_POOL!.execute(`INSERT INTO settings (id, value) VALUES (1, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`, [JSON.stringify(defaults)]);
    return defaults;
  } catch (err) {
    return readDbFile("settings.json", defaults);
  }
}

async function mysqlSaveSettings(settings: any) {
  writeDbFile("settings.json", settings);
  if (!(await ensureMysqlConnected())) return;
  try {
    await MYSQL_POOL!.execute(
      `INSERT INTO settings (id, value) VALUES (1, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [JSON.stringify(settings)]
    );
  } catch (err) {
    console.error("[MySQL] Failed to save settings payload:", err);
  }
}

async function mysqlGetCollection(table: string, filename: string, defaults: any[]) {
  if (!(await ensureMysqlConnected())) return readDbFile(filename, defaults);
  try {
    const [rows]: any = await MYSQL_POOL!.query(`SELECT data FROM ${table}`);
    const result = (rows as any[]).map((row) => safeParseJson(row.data));
    if (result.length === 0 && defaults.length > 0) {
      await mysqlSaveCollection(table, filename, defaults, table === "users" ? "userId" : "id");
      return defaults;
    }
    return result;
  } catch (err) {
    return readDbFile(filename, defaults);
  }
}

async function mysqlSaveCollection(table: string, filename: string, items: any[], idField: string) {
  // Local redundancy file writes execute immediately
  writeDbFile(filename, items);

  if (!(await ensureMysqlConnected())) return;
  
  const conn = await MYSQL_POOL!.getConnection();
  try {
    await conn.beginTransaction();
    
    if (items.length > 0) {
      for (const item of items) {
        const id = item[idField] || item.id || `GEN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await conn.execute(
          `INSERT INTO ${table} (${idField}, data) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE data = VALUES(data)`,
          [id, JSON.stringify(item)]
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error(`[MySQL] Data sync runtime failure on table ${table}:`, err);
  } finally {
    conn.release();
  }
}

async function mysqlAppendEmailLogs(logs: any[]) {
  const existingLogs = readDbFile("email_logs.json", []);
  existingLogs.unshift(...logs);
  writeDbFile("email_logs.json", existingLogs);

  if (!(await ensureMysqlConnected())) return;

  const conn = await MYSQL_POOL!.getConnection();
  try {
    await conn.beginTransaction();
    for (const log of logs) {
      await conn.execute(
        `INSERT INTO email_logs (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [log.id, JSON.stringify(log)]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
  } finally {
    conn.release();
  }
}

async function mysqlGetEmailLogs(defaults: any[]) {
  if (!(await ensureMysqlConnected())) return readDbFile("email_logs.json", defaults);
  try {
    const [rows]: any = await MYSQL_POOL!.query(`SELECT data FROM email_logs ORDER BY createdAt DESC`);
    return (rows as any[]).map((row) => safeParseJson(row.data));
  } catch (err) {
    return readDbFile("email_logs.json", defaults);
  }
}

function readDbFile(filename: string, defaultValue: any) {
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
    } catch { /* suppress */ }
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return defaultValue;
  }
}

function writeDbFile(filename: string, data: any) {
  const filePath = path.join(DB_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing database file ${filename}:`, err);
  }
}

function getEmailTransporter(settings: any) {
  const customGmail = settings?.gmailAddress;
  const customPass = settings?.googleAppPassword;

  if (customGmail && customPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: customGmail, pass: customPass }
    });
  }

  const host = process.env.SMTP_HOST || "";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  return {
    sendMail: async (mailOptions: any) => {
      console.log("================= SIMULATED OUTGOING EMAIL DISPATCH ================= ");
      console.log(`TO: ${mailOptions.to}`);
      console.log("=================================================================== ");
      return { messageId: `SIM-MSG-${Date.now()}` };
    }
  };
}

async function sendBookingConfirmationEmails(booking: any) {
  const defaults = { gmailAddress: 'vsvikash290@gmail.com', googleAppPassword: '' };
  const settings = await mysqlGetSettings(defaults);
  const senderEmail = settings.gmailAddress || 'shri.panditji.vedas@gmail.com';

  try {
    const tx = getEmailTransporter(settings);
    
    const adminMailOptions = {
      from: `"Pooja4Panditji Divine Portal" <${senderEmail}>`,
      to: 'vsvikash290@gmail.com',
      subject: `🕉️ [Admin Alert] Divine Puja Booked! ID: ${booking.id} - ${booking.customerName}`,
      html: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; background-color: #fffaf0;">
              <h2>Divine Yajna Booking - Admin Console</h2>
              <p><strong>Booking ID:</strong> ${booking.id}</p>
              <p><strong>Auspicious Service:</strong> ${booking.pujaName}</p>
              <p><strong>Devotee Name:</strong> ${booking.customerName}</p>
             </div>`
    };

    const devoteeMailOptions = {
      from: `"Pooja4Panditji Divine Dispatch" <${senderEmail}>`,
      to: booking.customerEmail,
      subject: `🕉️ Your Holy Booking is Confirmed! Service: ${booking.pujaName} 🕉️`,
      html: `<div style="font-family: sans-serif; max-width: 600px; padding: 25px; background-color: #fffcf8;">
              <h1>Hari Om, Devotee</h1>
              <p>Pranam <strong>${booking.customerName}</strong>! Your booking for <strong>${booking.pujaName}</strong> is locked.</p>
             </div>`
    };

    const adminRes = await tx.sendMail(adminMailOptions);
    const devoteeRes = await tx.sendMail(devoteeMailOptions);

    await mysqlAppendEmailLogs([
      {
        id: `EMAIL-ADM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from: adminMailOptions.from,
        to: adminMailOptions.to,
        subject: adminMailOptions.subject,
        status: adminRes?.messageId ? `Sent` : "Simulated"
      },
      {
        id: `EMAIL-DEV-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from: devoteeMailOptions.from,
        to: devoteeMailOptions.to,
        subject: devoteeMailOptions.subject,
        status: devoteeRes?.messageId ? `Sent` : "Simulated"
      }
    ]);
  } catch (err: any) {
    console.error("[Email Engine] Failed to dispatch booking emails:", err);
  }
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      throw new Error("GEMINI_API_KEY is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiClient;
}

// REST APIs
app.get("/api/health", async (req, res) => {
  const dbAvailable = await ensureMysqlConnected();
  res.json({ status: "healthy", timestamp: new Date().toISOString(), mysql: dbAvailable ? "connected" : "unavailable" });
});

app.get("/api/db-status", async (req, res) => {
  const dbAvailable = await ensureMysqlConnected();
  res.json({
    mysqlPool: !!MYSQL_POOL,
    mysqlReady: dbAvailable,
    config: { host: MYSQL_CONFIG.host, port: MYSQL_CONFIG.port, database: MYSQL_CONFIG.database }
  });
});

app.get("/api/settings", async (req, res) => {
  const defaults = {
    contactPhone: '+91 84450 30767',
    whatsappNumber: '+91 84450 30767',
    geminiApiKey: '',
    upiId: 'shastri.pandit108@okhdfcbank',
    upiQrUrl: '',
    panditName: 'Shyam Guru ji',
    panditCertification: 'Certified by Mathura Vedic Board',
    panditBio: 'Renowned scholar of Astro-Vedic rituals.',
    showExplorePujasTab: true,
    showAiPanditTab: true,
    showMyBookingsTab: true,
    showAdminPortalTab: true,
    devoteeTerms: 'Vedic rituals represent deep lineage devotion.'
  };
  res.json(await mysqlGetSettings(defaults));
});

app.post("/api/settings", async (req, res) => {
  await mysqlSaveSettings(req.body);
  res.json({ success: true, settings: req.body });
});

app.post("/api/upload", (req, res) => {
  const { filename, base64 } = req.body;
  if (!filename || !base64) return res.status(400).json({ error: "Missing payload." });
  try {
    let pureBase64 = base64.includes(";base64,") ? base64.split(";base64,").pop() || "" : base64;
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), Buffer.from(pureBase64, "base64"));
    res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to save asset." });
  }
});

app.get("/api/pujas", async (req, res) => {
  res.json(await mysqlGetCollection("pujas", "pujas.json", PUJAS_DATA));
});

app.post("/api/pujas", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Must be an array." });
  await mysqlSaveCollection("pujas", "pujas.json", req.body, "id");
  res.json({ success: true, pujas: req.body });
});

app.get("/api/bookings", async (req, res) => {
  const defaults = [{
    id: 'BKG-9843-VEDA', pujaId: 'satyanarayan', pujaName: 'Sri Satyanarayan Puja',
    customerName: 'Vikas Savita', customerPhone: '+91 84450 30767', customerEmail: 'vsvikash290@gmail.com',
    gothra: 'Bhardwaj', nakshatra: 'Rohini', mode: 'e-puja', dateTime: '2026-06-15T09:30', price: 2100, status: 'confirmed'
  }];
  res.json(await mysqlGetCollection("bookings", "bookings.json", defaults));
});

app.post("/api/bookings", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Must be an array." });
  try {
    const previousBookings = await mysqlGetCollection("bookings", "bookings.json", []);
    for (const b of req.body) {
      if (b.status === 'confirmed') {
        const wasAlreadyConfirmed = previousBookings.some((prev: any) => prev.id === b.id && prev.status === 'confirmed');
        if (!wasAlreadyConfirmed) await sendBookingConfirmationEmails(b);
      }
    }
  } catch (err) { /* silent fail */ }
  await mysqlSaveCollection("bookings", "bookings.json", req.body, "id");
  res.json({ success: true, bookings: req.body });
});

app.get("/api/email-logs", async (req, res) => {
  res.json(await mysqlGetEmailLogs([]));
});

app.get("/api/users", async (req, res) => {
  const defaults = [{
    userId: 'vsvikash290@gmail.com', passwordHash: 'password123', fullName: 'Vikas Savita',
    phone: '+91 84450 30767', email: 'vsvikash290@gmail.com', createdAt: '2026-05-18T10:00:00Z'
  }];
  res.json(await mysqlGetCollection("users", "users.json", defaults));
});

app.post("/api/users", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Must be an array." });
  await mysqlSaveCollection("users", "users.json", req.body, "userId");
  res.json({ success: true, users: req.body });
});

app.post("/api/chat", async (req, res) => {
  const { messages, customApiKey, language, panditName, panditCertification, panditBio } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages required." });

  const name = panditName || "Shyam Guru ji";
  const cert = panditCertification || "Certified by Mathura Vedic Board";
  const bio = panditBio || "Renowned scholar.";
  const lang = language || "multilingual";

  const pujaCatalog = await mysqlGetCollection("pujas", "pujas.json", PUJAS_DATA);
  const catalogueDescription = pujaCatalog.map((p: any) => `- ${p.name}: ${p.tagline || ''}`).join("\n");
  const customInstruction = `You are "${name}", ${cert}. Bio: ${bio}. Mode: ${lang}. Catalog:\n${catalogueDescription}`;

  try {
    let ai = (customApiKey && customApiKey.trim() !== "" && !customApiKey.startsWith("placeholder"))
      ? new GoogleGenAI({ apiKey: customApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build-custom' } } })
      : getGeminiClient();

    const formattedHistory = messages.map(msg => {
      const parts: any[] = [{ text: msg.text || "" }];
      if (msg.sender === "user" && msg.attachedImageUrl) {
        try {
          const localFilePath = path.join(UPLOADS_DIR, path.basename(msg.attachedImageUrl));
          if (fs.existsSync(localFilePath)) {
            parts.push({
              inlineData: { data: fs.readFileSync(localFilePath).toString("base64"), mimeType: msg.attachedImageMime || "image/jpeg" }
            });
          }
        } catch { /* suppress */ }
      }
      return { role: msg.sender === "user" ? "user" : "model", parts };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: { systemInstruction: customInstruction, temperature: 0.7 }
    });
    res.json({ text: response.text || "Pranam. Let me meditate and reply shortly." });
  } catch (error: any) {
    res.json({ text: `Pranam. Connection paused. Please check your GEMINI_API_KEY configuration.`, fallback: true });
  }
});

async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  await ensureMysqlConnected();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pooja4Panditji server running on port ${PORT}`);
  });
}

initServer().catch((err) => console.error("Initialization Error:", err));