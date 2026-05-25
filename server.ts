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

// Setup persistent JSON file-based database
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

const MYSQL_DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_DATABASE_URL || process.env.CLEARDB_DATABASE_URL || process.env.JAWSDB_URL || "";
const MYSQL_CONFIG = MYSQL_DATABASE_URL
  ? parseDatabaseUrl(MYSQL_DATABASE_URL)
  : {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || process.env.MYSQLHOST || process.env.DB_HOSTNAME || "localhost",
      user: process.env.MYSQL_USER || process.env.DB_USER || process.env.MYSQLUSER || process.env.DB_USERNAME || "",
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || process.env.MYSQLPASS || process.env.DB_USER_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.MYSQLDB || process.env.DB_DATABASE || "",
      port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || process.env.MYSQLPORT || "3306", 10),
      ssl:
        process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1"
          ? { rejectUnauthorized: true }
          : undefined
    };

const MYSQL_POOL: Pool | null = MYSQL_CONFIG.user && MYSQL_CONFIG.password && MYSQL_CONFIG.database
  ? createPool({
      host: MYSQL_CONFIG.host,
      user: MYSQL_CONFIG.user,
      password: MYSQL_CONFIG.password,
      database: MYSQL_CONFIG.database,
      port: MYSQL_CONFIG.port,
      ssl: MYSQL_CONFIG.ssl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true
    })
  : null;

if (!MYSQL_POOL) {
  console.warn("[MySQL] No database pool created. Check your DATABASE_URL or MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE environment variables.");
} else {
  console.log(`[MySQL] Configured pool for ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database} ssl=${!!MYSQL_CONFIG.ssl}`);
}

let mysqlReady = false;

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get("ssl") || parsed.searchParams.get("sslmode") || parsed.searchParams.get("tls");
  const sslEnabled = sslMode === "true" || sslMode === "require" || sslMode === "verify_ca" || sslMode === "verify_identity" || parsed.protocol === "mysqls:";

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306", 10),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname?.slice(1) || "",
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  };
}

async function ensureMysqlConnected() {
  if (!MYSQL_POOL) {
    console.warn("[MySQL] Pool unavailable. MySQL persistence is disabled.");
    return false;
  }
  if (mysqlReady) return true;
  try {
    const conn = await MYSQL_POOL.getConnection();
    await conn.ping();
    await ensureMysqlTables(conn);
    conn.release();
    mysqlReady = true;
    console.log("[MySQL] Connected to Railway MySQL successfully.");
    return true;
  } catch (err) {
    console.error("[MySQL] connection failed, falling back to local JSON files:", err);
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
  const [rows]: any = await MYSQL_POOL!.query(`SELECT value FROM settings WHERE id = 1 LIMIT 1`);
  const record = rows[0];
  if (record?.value) {
    return safeParseJson(record.value);
  }
  await MYSQL_POOL!.execute(`INSERT INTO settings (id, value) VALUES (1, ?)`, [JSON.stringify(defaults)]);
  return defaults;
}

async function mysqlSaveSettings(settings: any) {
  if (!(await ensureMysqlConnected())) {
    writeDbFile("settings.json", settings);
    return;
  }
  await MYSQL_POOL!.execute(
    `INSERT INTO settings (id, value) VALUES (1, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [JSON.stringify(settings)]
  );
}

async function mysqlGetCollection(table: string, filename: string, defaults: any[]) {
  if (!(await ensureMysqlConnected())) return readDbFile(filename, defaults);
  const [rows]: any = await MYSQL_POOL!.query(`SELECT data FROM ${table}`);
  const result = (rows as any[]).map((row) => safeParseJson(row.data));
  if (result.length === 0 && defaults.length > 0) {
    await mysqlSaveCollection(table, filename, defaults, table === "users" ? "userId" : "id");
    return defaults;
  }
  return result;
}

async function mysqlSaveCollection(table: string, filename: string, items: any[], idField: string) {
  if (!(await ensureMysqlConnected())) {
    writeDbFile(filename, items);
    return;
  }
  const conn = await MYSQL_POOL!.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`DELETE FROM ${table}`);
    if (items.length > 0) {
      const values = items.map((item) => [item[idField] || item.id || `GEN-${Date.now()}-${Math.floor(Math.random() * 10000)}`, JSON.stringify(item)]);
      await conn.query(`INSERT INTO ${table} (${idField}, data) VALUES ?`, [values]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error(`[MySQL] Failed to persist ${table}, writing to local JSON fallback:`, err);
    writeDbFile(filename, items);
  } finally {
    conn.release();
  }
}

async function mysqlAppendEmailLogs(logs: any[]) {
  if (!(await ensureMysqlConnected())) {
    const existingLogs = readDbFile("email_logs.json", []);
    existingLogs.unshift(...logs);
    writeDbFile("email_logs.json", existingLogs);
    return;
  }

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
    console.error("[MySQL] Failed to persist email log entries, falling back to JSON:", err);
    const existingLogs = readDbFile("email_logs.json", []);
    existingLogs.unshift(...logs);
    writeDbFile("email_logs.json", existingLogs);
  } finally {
    conn.release();
  }
}

async function mysqlGetEmailLogs(defaults: any[]) {
  if (!(await ensureMysqlConnected())) return readDbFile("email_logs.json", defaults);
  const [rows]: any = await MYSQL_POOL!.query(`SELECT data FROM email_logs ORDER BY createdAt DESC`);
  return (rows as any[]).map((row) => safeParseJson(row.data));
}

function readDbFile(filename: string, defaultValue: any) {
  const filePath = path.join(DB_DIR, filename);
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

function writeDbFile(filename: string, data: any) {
  const filePath = path.join(DB_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error persisting database file ${filename}:`, err);
  }
}

// NodeMailer Divine Email Notification Engine
function getEmailTransporter(settings: any) {
  const customGmail = settings?.gmailAddress;
  const customPass = settings?.googleAppPassword;

  // Real SMTP config prioritizing user's customized Gmail + App Password in Admin Portal settings
  if (customGmail && customPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: customGmail,
        pass: customPass
      }
    });
  }

  // Fallback to Env variables if defined
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

  // Virtual Dev-mode simulated transporter fallback
  return {
    sendMail: async (mailOptions: any) => {
      console.log("================= SIMULATED OUTGOING EMAIL DISPATCH ================= ");
      console.log(`FROM: ${mailOptions.from}`);
      console.log(`TO: ${mailOptions.to}`);
      console.log(`SUBJECT: ${mailOptions.subject}`);
      console.log(`HTML BODY LENGTH: ${mailOptions.html?.length || 0} characters`);
      console.log("=================================================================== ");
      return { messageId: `SIM-MSG-${Date.now()}` };
    }
  };
}

async function sendBookingConfirmationEmails(booking: any) {
  const defaults = {
    contactPhone: '+91 84450 30767',
    whatsappNumber: '+91 84450 30767',
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
    devoteeTerms: '1. All devotion services (Shradha Dakshina) are verified secure.\n2. The simulated handshakes are for instructional, direct, offline and virtual connect.\n3. By booking any puja, the devotee agrees to provide accurate Birth coordinates, Gothra and Nakshatra.\n4. Standard 24 Hours validity applies to digital chatbot and voice consult channels.\n5. Vedic rituals represent deep lineage devotion.',
    gmailAddress: 'vsvikash290@gmail.com',
    googleAppPassword: ''
  };
  
  const settings = await mysqlGetSettings(defaults);
  const senderEmail = settings.gmailAddress || 'shri.panditji.vedas@gmail.com';

  try {
    const tx = getEmailTransporter(settings);
    
    // 1. Admin Email (to vsvikash290@gmail.com)
    const adminMailOptions = {
      from: `"Pooja4Panditji Divine Portal" <${senderEmail}>`,
      to: 'vsvikash290@gmail.com',
      subject: `🕉️ [Admin Alert] Divine Puja Booked! ID: ${booking.id} - ${booking.customerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffedd5; border-radius: 12px; background-color: #fffaf0;">
          <h2 style="color: #ea580c; text-align: center; border-bottom: 2px solid #ffedd5; padding-bottom: 10px;">Divine Yajna Booking - Admin Console</h2>
          <p style="font-size: 14px; color: #4b5563;">Pranam Shastri Ji, a new auspicious Puja session has been confirmed on the portal. Please note the devotee birth charts and parameters below:</p>
          
          <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #ea580c; margin: 15px 0;">
            <p style="margin: 4px 0; font-size: 13.5px;"><strong>Booking ID:</strong> ${booking.id}</p>
            <p style="margin: 4px 0; font-size: 13.5px;"><strong>Auspicious Service:</strong> ${booking.pujaName}</p>
            <p style="margin: 4px 0; font-size: 13.5px;"><strong>Package Chosen:</strong> ${booking.packageName || 'Standard'} (₹${booking.price})</p>
            <p style="margin: 4px 0; font-size: 13.5px;"><strong>Auspicious Date/Time:</strong> ${new Date(booking.dateTime).toLocaleString()}</p>
          </div>

          <h3 style="color: #ea580c; font-size: 15px; margin-top: 20px;">Devotee Birth Details (Kundali Coordinates)</h3>
          <table style="width: 100%; font-size: 13px; text-align: left; border-collapse: collapse; margin-top: 5px;">
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Devotee Name</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.customerName}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Primary Email</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.customerEmail}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Primary Mobile</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.customerPhone}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Gotra (Clan)</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.gothra || 'Kashyap (Default)'}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Nakshatra (Moon-sign)</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.nakshatra || 'Anuradha (Default)'}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Sankalp Names</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.sankalpNames || booking.customerName}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Puja Mode</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.mode === 'e-puja' ? 'E-Puja (Online Video Broadcast)' : 'In-Person Temple Yajna'}</td></tr>
            <tr><th style="padding: 6px; border-bottom: 1px solid #f1f5f9;">Samagri Kit</th><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${booking.includeSamagriKit ? 'Yes (Deliver to Home Address)' : 'No'}</td></tr>
          </table>

          ${booking.notes ? `
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin-top: 15px; font-size: 13px; color: #64748b;">
            <strong>Devotee Prayer/Notes:</strong> "${booking.notes}"
          </div>` : ''}

          <div style="margin-top: 25px; font-size: 12px; color: #94a3b8; text-align: center;">
            This administrative message is dispatched automatically from your Pooja4Panditji server.
          </div>
        </div>
      `
    };

    // 2. Devotee Receipt Email
    const devoteeMailOptions = {
      from: `"Pooja4Panditji Divine Dispatch" <${senderEmail}>`,
      to: booking.customerEmail,
      subject: `🕉️ Your Holy Booking is Confirmed! Service: ${booking.pujaName} 🕉️`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 2px solid #ea580c; border-radius: 16px; background-color: #fffcf8;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">🕉️</span>
            <h1 style="color: #c2410c; margin: 4px 0 2px 0; font-family: Georgia, serif;">Hari Om, Devotee</h1>
            <p style="color: #ea580c; font-style: italic; font-size: 13px; margin: 0;">Blessed Greetings from Pooja4Panditji</p>
          </div>

          <p style="font-size: 14.5px; color: #4338ca; line-height: 1.6; text-align: center;">
            Pranam <strong>${booking.customerName}</strong>! We are honored to confirm that your booking for the holy <strong>${booking.pujaName}</strong> is successfully locked and certified.
          </p>

          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #ffedd5; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin: 20px 0;">
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Divine Token ID:</strong> <span style="font-family: monospace; color: #c2410c; font-weight: bold;">${booking.id}</span></p>
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Auspicious Puja:</strong> ${booking.pujaName}</p>
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Altar Layout Package:</strong> ${booking.packageName || 'Standard'}</p>
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Divine Price Dakshina:</strong> ₹${booking.price}</p>
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Scheduled Muhurat Time:</strong> ${new Date(booking.dateTime).toLocaleString()}</p>
            <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Astrological Gotra:</strong> ${booking.gothra || 'Kashyap (Default)'}</p>
          </div>

          <p style="font-size: 13.5px; color: #4b5563; line-height: 1.5;">
            Our head Shastri, <strong>Shyam Guru ji</strong>, will prepare your personalized Sankalp ritual using your coordinates. If you chose e-Puja, you will receive your live stream video broadcast details on WhatsApp or email prior to the muhurat.
          </p>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 10px; text-align: center; margin-top: 25px;">
            <h4 style="margin: 0 0 5px 0; color: #b45309; font-size: 13px;">📞 Need Urgent Assistance or Birth Chart Matching?</h4>
            <p style="margin: 0; font-size: 12.5px; color: #78350f;">
              Talk directly with Pandit Ji's helpdesk over Phone or WhatsApp at <strong>+91 84450 30767</strong>.
            </p>
          </div>

          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            May the supreme divine forces bring absolute prosperity, longevity, and peace to your family.<br>
            <strong>🕉️ Har Har Mahadev 🕉️</strong>
          </p>
        </div>
      `
    };

    const adminRes = await tx.sendMail(adminMailOptions);
    const devoteeRes = await tx.sendMail(devoteeMailOptions);

    const logsToAdd = [
      {
        id: `EMAIL-ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        from: adminMailOptions.from,
        to: adminMailOptions.to,
        subject: adminMailOptions.subject,
        html: adminMailOptions.html,
        status: adminRes?.messageId ? `Sent via SMTP (id: ${adminRes.messageId})` : "Simulated/Dispatched (Vedic channel check)"
      },
      {
        id: `EMAIL-DEV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        from: devoteeMailOptions.from,
        to: devoteeMailOptions.to,
        subject: devoteeMailOptions.subject,
        html: devoteeMailOptions.html,
        status: devoteeRes?.messageId ? `Sent via SMTP (id: ${devoteeRes.messageId})` : "Simulated/Dispatched (Vedic channel check)"
      }
    ];

    await mysqlAppendEmailLogs(logsToAdd);

  } catch (err: any) {
    console.error("[Email Engine] Failed to dispatch booking emails:", err);
    
    const errorLog = {
      id: `EMAIL-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      from: senderEmail,
      to: `${booking.customerEmail} & vsvikash290@gmail.com`,
      subject: `⚠️ FAILURE: ${booking.pujaName} Email Transmission`,
      html: `<div style="color: #991b1b; padding: 15px; border: 1px solid #fee2e2; border-radius: 8px; background-color: #fef2f2; font-family: monospace;">
        <strong>Gmail / Google App Password Auth Failed:</strong><br>${err.message || err}<br><br>
        <strong>Hint:</strong> Please verify in "Global Devotion Settings" if your Gmail Address matches perfectly and your Google App Password (16 characters from google security account) matches perfectly without spaces.
      </div>`,
      status: `Failed: ${err.message || 'Unknown SMTP error'}`
    };
    await mysqlAppendEmailLogs([errorLog]);
  }
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
app.get("/api/health", async (req, res) => {
  const dbAvailable = await ensureMysqlConnected();
  res.json({ status: "healthy", timestamp: new Date().toISOString(), mysql: dbAvailable ? "connected" : "unavailable" });
});

app.get("/api/db-status", async (req, res) => {
  const dbAvailable = await ensureMysqlConnected();
  res.json({
    mysqlPool: !!MYSQL_POOL,
    mysqlReady: dbAvailable,
    config: {
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      user: MYSQL_CONFIG.user,
      database: MYSQL_CONFIG.database,
      ssl: !!MYSQL_CONFIG.ssl
    }
  });
});

// Settings REST APIs
app.get("/api/settings", async (req, res) => {
  const defaults = {
    contactPhone: '+91 84450 30767',
    whatsappNumber: '+91 84450 30767',
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
  const settings = await mysqlGetSettings(defaults);
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  const newSettings = req.body;
  await mysqlSaveSettings(newSettings);
  res.json({ success: true, settings: newSettings });
});

// Dynamic Divine Photo Attachment Gateway
app.post("/api/upload", (req, res) => {
  const { filename, base64 } = req.body;
  if (!filename || !base64) {
    return res.status(400).json({ error: "Missing filename or base64 photo payload." });
  }

  try {
    let pureBase64 = base64;
    if (base64.includes(";base64,")) {
      pureBase64 = base64.split(";base64,").pop() || "";
    }

    // Clean filename and make it unique with timestamp to prevent collisions
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const targetPath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(targetPath, Buffer.from(pureBase64, "base64"));
    console.log(`[Vedic Storage] Saved uploaded photo: ${safeName}`);

    // Return the relative public URL path
    res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (err: any) {
    console.error("Failed to save uploaded image asset:", err);
    res.status(500).json({ error: "Failed to persist dynamic asset binary on the shrine host." });
  }
});

// Catalog Pujas REST APIs
app.get("/api/pujas", async (req, res) => {
  const pujas = await mysqlGetCollection("pujas", "pujas.json", PUJAS_DATA);
  res.json(pujas);
});

app.post("/api/pujas", async (req, res) => {
  const newPujas = req.body;
  if (!Array.isArray(newPujas)) {
    return res.status(400).json({ error: "Catalog must be an array." });
  }
  await mysqlSaveCollection("pujas", "pujas.json", newPujas, "id");
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
  const bookings = await mysqlGetCollection("bookings", "bookings.json", defaults);
  res.json(bookings);
});

app.post("/api/bookings", async (req, res) => {
  const newBookings = req.body;
  if (!Array.isArray(newBookings)) {
    return res.status(400).json({ error: "Bookings must be an array." });
  }

  // Handle email triggers for newly confirmed bookings
  try {
    const previousBookings = await mysqlGetCollection("bookings", "bookings.json", []);
    for (const b of newBookings) {
      if (b.status === 'confirmed') {
        const wasAlreadyConfirmed = previousBookings.some((prev: any) => prev.id === b.id && prev.status === 'confirmed');
        if (!wasAlreadyConfirmed) {
          await sendBookingConfirmationEmails(b);
        }
      }
    }
  } catch (err) {
    console.error("Error checking bookings for email dispatches:", err);
  }

  await mysqlSaveCollection("bookings", "bookings.json", newBookings, "id");
  res.json({ success: true, bookings: newBookings });
});

// Email dispatch logs endpoint for admin verification
app.get("/api/email-logs", async (req, res) => {
  const logs = await mysqlGetEmailLogs([]);
  res.json(logs);
});

// Users REST APIs
app.get("/api/users", async (req, res) => {
  const defaults = [
    {
      userId: 'vsvikash290@gmail.com',
      passwordHash: 'password123',
      fullName: 'Vikas Savita',
      phone: '+91 84450 30767',
      email: 'vsvikash290@gmail.com',
      gothra: 'Bhardwaj',
      nakshatra: 'Rohini',
      createdAt: '2026-05-18T10:00:00Z'
    },
    {
      userId: 'vikas.savita@smollan.com',
      passwordHash: 'password123',
      fullName: 'Vikas Savita',
      phone: '+91 84450 30767',
      email: 'vikas.savita@smollan.com',
      gothra: 'Bhardwaj',
      nakshatra: 'Rohini',
      createdAt: '2026-05-18T10:00:00Z'
    }
  ];
  const users = await mysqlGetCollection("users", "users.json", defaults);
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const newUsers = req.body;
  if (!Array.isArray(newUsers)) {
    return res.status(400).json({ error: "Users list must be an array." });
  }
  await mysqlSaveCollection("users", "users.json", newUsers, "userId");
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

  const pujaCatalog = await mysqlGetCollection("pujas", "pujas.json", PUJAS_DATA);
  const catalogueDescription = pujaCatalog
    .map((puja: any) => {
      const summary = puja.tagline || (typeof puja.description === "string" ? puja.description.trim().replace(/\s+/g, " ").slice(0, 120) + "..." : "A sacred puja ritual from the catalogue.");
      return `- ${puja.name}: ${summary}`;
    })
    .join("\n");

  const customInstruction = `
You are "${name}", a highly revered, compassionate, and wise Vedic priest, Sanskrit scholar, and spiritual guide.
You are "${cert}".
Your biography: ${bio}.
You are the spiritual advisor for "Pooja4Panditji", a highly respected online platform for booking authentic Pujas, Havans, and rituals.
Your mission is to guide devotees respectfully, offer compassionate counsel, explain complex ritual symbols simply, and assist them in identifying the right Puja.

Current puja catalog:
${catalogueDescription}

Key Professional Directives:
1. Tone: Always speak in a warm, humble, reassuring, and highly respectful tone. Use classical Vedic greetings such as "Peace be upon you", "Om Namah Shivaya", "Namaste", or "Pranam dear devotee" at the top of your reply, but maintain high conversational elegance.
2. Language: The devotee has requested you to reply in language setting: ${lang}. Ensure you respond in this language or naturally follow the devotee's language preference (e.g. English, Hindi, Sanskrit, Regional, etc.). If lang is 'multilingual' or 'Hinglish', communicate in a mixture of Hindi, English, and Sanskrit that is easy to understand.
3. Catalog Mapping: Use the current live puja catalog above to recommend rituals. When a devotee describes a problem, choose the most relevant offering from the catalog and explain why it is appropriate. Include the puja name, the main benefits, when it is usually performed, and the key samagri or astrological context if available. If a new puja is added to the catalog, it should be considered as part of the available recommendations.
4. Scope: Answer only astrological, Vedic, puja, muhurat, nakshatra, kundali, vastu, or remedial ritual concerns. If the user asks about something outside astrology or ritual guidance, politely tell them that your expertise is limited to spiritual and astrological services.
5. Samagri Wisdom: Discuss materials lovingly (e.g., coconut representing human ego being broken to offer sweet purity, ghee representing clarity of intellect, darbha grass, bael leaves, turmeric, gangajal, etc.).
6. Philosophical Realism: Remind them that rituals are devotional avenues to realign inner and outer energies; we do not sell magic cures.
7. Format: Keep replies extremely clear, elegant, utilizing paragraphs and neat bullet points for samagri or benefits. Keep answers around 2-3 short, scannable paragraphs. Do not write extremely long text.
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
    const formattedHistory = [];
    for (const msg of messages) {
      const parts: any[] = [{ text: msg.text || "" }];
      if (msg.sender === "user" && msg.attachedImageUrl) {
        try {
          const safeBasename = path.basename(msg.attachedImageUrl);
          const localFilePath = path.join(UPLOADS_DIR, safeBasename);
          if (fs.existsSync(localFilePath)) {
            const rawBuffer = fs.readFileSync(localFilePath);
            const mimeType = msg.attachedImageMime || "image/jpeg";
            parts.push({
              inlineData: {
                data: rawBuffer.toString("base64"),
                mimeType: mimeType
              }
            });
            console.log(`[Vedic AI] Feeding attached photo from user message to Gemini: ${safeBasename}`);
          }
        } catch (imgErr) {
          console.error("Error reading attached image from local file:", imgErr);
        }
      }
      formattedHistory.push({
        role: msg.sender === "user" ? "user" : "model",
        parts
      });
    }

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
      fallbackText += "The divine network requires setup. Please make sure to add your GEMINI_API_KEY in the Secrets panel of AI Studio so I can connect deep Vedic intelligence for you. Ask me about your nakshatra, muhurat, vastu, or which puja in the catalog best fits your situation.";
    } else {
      fallbackText += "A brief spiritual pause has occurred. How can I guide you on your astrological concern, puja selection, or remedial ritual today?";
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

  await ensureMysqlConnected();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pooja4Panditji server running on port ${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Error launching server:", err);
});
