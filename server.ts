import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createPool, Pool, PoolConnection } from "mysql2/promise";
import { PUJAS_DATA } from "./src/data/pujas";
import { DEFAULT_GALLERY_DATA } from "./src/data/gallery";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const PORT = 3000;

// ===== Razorpay Configuration =====
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_placeholder'
});

// ===== Email Configuration (SMTP) =====
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

// Verify email transporter
emailTransporter.verify().catch(err => {
  console.warn('[Email] SMTP configuration warning:', err.message);
  console.warn('[Email] Emails will not be sent. Configure SMTP in .env file.');
});

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
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS gallery (
      id VARCHAR(255) PRIMARY KEY,
      data JSON NOT NULL
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
  console.log('[Upload] Received upload request:', { filename: filename?.substring(0, 50), hasBase64: !!base64 });
  
  if (!filename || !base64) {
    console.error("[Upload] Missing filename or base64 payload in request body:", Object.keys(req.body || {}));
    return res.status(400).json({ success: false, error: "Missing filename or base64 payload." });
  }
  try {
    let pureBase64 = base64.includes(";base64,") ? base64.split(";base64,").pop() || "" : base64;
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const targetPath = path.join(UPLOADS_DIR, safeName);
    
    const buffer = Buffer.from(pureBase64, "base64");
    fs.writeFileSync(targetPath, buffer);
    
    console.log(`[Upload] Successfully saved image to: ${targetPath} (${buffer.length} bytes)`);
    const uploadedUrl = `/uploads/${safeName}`;
    res.json({ success: true, url: uploadedUrl });
  } catch (err) {
    console.error("[Upload] Critical error saving photo upload:", err);
    res.status(500).json({ success: false, error: "Failed to save asset to server: " + String(err).substring(0, 100) });
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

app.get("/api/gallery", async (req, res) => {
  res.json(await mysqlGetCollection("gallery", "gallery.json", DEFAULT_GALLERY_DATA));
});

app.post("/api/gallery", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Must be an array." });
  await mysqlSaveCollection("gallery", "gallery.json", req.body, "id");
  res.json({ success: true, gallery: req.body });
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

// In-memory store for CAPTCHA challenges (per session)
const captchaSessions = new Map<string, { challenge: string; answer: number; timestamp: number }>();

// Simple in-house captcha challenge generator for payment flow
app.post('/api/captcha-challenge', async (req, res) => {
  try {
    // Simple arithmetic challenge
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const answer = a + b;
    const challenge = `${a} + ${b}`;
    const sessionId = `captcha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Store answer in memory with 10-minute TTL
    captchaSessions.set(sessionId, { challenge, answer, timestamp: Date.now() });
    
    // Auto-cleanup old sessions
    const now = Date.now();
    for (const [key, val] of captchaSessions.entries()) {
      if (now - val.timestamp > 10 * 60 * 1000) captchaSessions.delete(key);
    }
    
    res.json({ success: true, challenge, sessionId, hint: 'Please compute the sum.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate challenge.' });
  }
});

// CAPTCHA verification endpoint
app.post('/api/captcha-verify', async (req, res) => {
  try {
    const { answer, sessionId } = req.body;
    
    if (!sessionId || !captchaSessions.has(sessionId)) {
      return res.json({ success: false, error: 'Session expired or invalid. Please retry payment.' });
    }
    
    const session = captchaSessions.get(sessionId)!;
    const userAnswer = parseInt(answer, 10);
    
    if (isNaN(userAnswer) || userAnswer !== session.answer) {
      return res.json({ success: false, error: 'Incorrect answer. Please try again.' });
    }
    
    // Valid CAPTCHA - remove session and return success
    captchaSessions.delete(sessionId);
    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    console.error('[CAPTCHA] Verification error:', err);
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// ===== RAZORPAY PAYMENT ENDPOINTS =====

// Helper: Send booking confirmation email
async function sendBookingConfirmation(booking: any) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Email] Skipped (SMTP not configured). Booking:', booking.id);
    return false;
  }
  
  try {
    const meetingLink = booking.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${booking.meetingLink}">${booking.meetingLink}</a></p>` : '';
    const addressLine = booking.address ? `<p><strong>Address:</strong> ${booking.address}</p>` : '';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h1 style="color: #D97706; text-align: center;">🙏 Puja Booking Confirmation</h1>
        <p>Dear <strong>${booking.customerName}</strong>,</p>
        <p>Your puja booking has been confirmed and payment has been received. Here are your booking details:</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <h2 style="color: #1F2937; font-size: 18px;">Booking Details</h2>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Puja:</strong> ${booking.pujaName}</p>
        <p><strong>Package:</strong> ${booking.packageName}</p>
        <p><strong>Date & Time:</strong> ${new Date(booking.dateTime).toLocaleString()}</p>
        <p><strong>Mode:</strong> ${booking.mode.replace('-', ' ').toUpperCase()}</p>
        <p><strong>Language:</strong> ${booking.language}</p>
        ${addressLine}
        ${meetingLink}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <h2 style="color: #1F2937; font-size: 18px;">Payment Details</h2>
        <p><strong>Amount Paid:</strong> ₹${booking.price.toLocaleString('en-IN')}</p>
        <p><strong>Payment ID:</strong> ${booking.razorpayPaymentId || booking.paymentId || 'N/A'}</p>
        <p><strong>Payment Date:</strong> ${booking.paidAt ? new Date(booking.paidAt).toLocaleString() : new Date().toLocaleString()}</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <h2 style="color: #1F2937; font-size: 18px;">Devotee Information</h2>
        <p><strong>Name:</strong> ${booking.customerName}</p>
        <p><strong>Gothra:</strong> ${booking.gothra || 'Not specified'}</p>
        <p><strong>Nakshatra:</strong> ${booking.nakshatra || 'Not specified'}</p>
        <p><strong>Sankalp Names:</strong> ${booking.sankalpNames || 'Not specified'}</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <p style="text-align: center; color: #6B7280; font-size: 14px;">
          Thank you for choosing Pooja4Panditji. Your puja will be performed as per Vedic rituals.<br>
          For any queries, please contact us at +91 84450 30767
        </p>
        <p style="text-align: center; color: #9CA3AF; font-size: 12px;">
          This is an automated email. Please do not reply.
        </p>
      </div>
    `;
    
    const info = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: booking.customerEmail,
      subject: `✨ Puja Booking Confirmed - ${booking.pujaName} (Booking ID: ${booking.id})`,
      html: htmlContent
    });
    
    console.log('[Email] Confirmation sent to', booking.customerEmail, '- Message ID:', info.messageId);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send confirmation:', err);
    return false;
  }
}

// Create Razorpay Order
app.post('/api/create-payment', async (req, res) => {
  try {
    const { bookingId, amount, currency = 'INR', customerEmail, customerName } = req.body;
    
    if (!bookingId || !amount || !customerEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields: bookingId, amount, customerEmail' });
    }
    
    // Validate amount server-side (must be in paise for Razorpay)
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({ success: false, error: 'Minimum amount is ₹1.00' });
    }
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId,
        customerName,
        customerEmail
      }
    });
    
    console.log('[Razorpay] Order created:', order.id, 'for booking:', bookingId);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[Razorpay] Order creation failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create payment order' });
  }
});

// Razorpay Webhook Handler
app.post('/api/webhook/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    
    // Verify webhook signature
    if (webhookSecret && signature) {
      const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (hash !== signature) {
        console.warn('[Webhook] Invalid signature received');
        return res.status(400).json({ success: false, error: 'Invalid signature' });
      }
    } else {
      console.warn('[Webhook] No webhook secret configured - skipping signature verification');
    }
    
    const event = req.body.event;
    const eventData = req.body.payload?.payment?.entity || req.body.payload?.order?.entity || {};
    
    console.log('[Webhook] Event received:', event);
    
    if (event === 'payment.authorized' || event === 'payment.captured') {
      const paymentId = eventData.id;
      const orderId = eventData.order_id;
      const receipt = eventData.receipt;
      const notes = eventData.notes || {};
      const bookingId = notes.bookingId;
      
      if (!bookingId) {
        console.warn('[Webhook] No bookingId found in payment notes');
        return res.status(400).json({ success: false, error: 'No bookingId in notes' });
      }
      
      // Get all bookings and find the one to update
      const bookings = await mysqlGetCollection('bookings', 'bookings.json', []);
      const bookingIndex = bookings.findIndex((b: any) => b.id === bookingId);
      
      if (bookingIndex === -1) {
        console.warn('[Webhook] Booking not found:', bookingId);
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      // Update booking with payment details
      const booking = bookings[bookingIndex];
      booking.status = 'paid';
      booking.paymentStatus = 'paid';
      booking.razorpayPaymentId = paymentId;
      booking.razorpayOrderId = orderId;
      booking.paidAt = new Date().toISOString();
      booking.paymentId = paymentId;
      booking.paymentMethod = 'Razorpay';
      
      // Save updated bookings
      await mysqlSaveCollection('bookings', 'bookings.json', bookings, 'id');
      
      // Send confirmation email
      await sendBookingConfirmation(booking);
      
      console.log('[Webhook] Booking marked as paid:', bookingId);
      return res.json({ success: true, message: 'Payment confirmed' });
    }
    
    if (event === 'payment.failed') {
      const paymentId = eventData.id;
      const orderId = eventData.order_id;
      const notes = eventData.notes || {};
      const bookingId = notes.bookingId;
      
      const bookings = await mysqlGetCollection('bookings', 'bookings.json', []);
      const bookingIndex = bookings.findIndex((b: any) => b.id === bookingId);
      
      if (bookingIndex !== -1) {
        bookings[bookingIndex].status = 'failed';
        bookings[bookingIndex].paymentStatus = 'failed';
        await mysqlSaveCollection('bookings', 'bookings.json', bookings, 'id');
        console.log('[Webhook] Booking marked as failed:', bookingId);
      }
      
      return res.json({ success: true, message: 'Payment failure recorded' });
    }
    
    res.json({ success: true, message: 'Event processed' });
  } catch (err) {
    console.error('[Webhook] Error processing webhook:', err);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// Verify Payment (fallback for checking payment status)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }
    
    // Verify signature
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (signature !== razorpaySignature) {
      return res.json({ success: false, error: 'Invalid payment signature' });
    }
    
    // Update booking if bookingId provided
    if (bookingId) {
      const bookings = await mysqlGetCollection('bookings', 'bookings.json', []);
      const bookingIndex = bookings.findIndex((b: any) => b.id === bookingId);
      
      if (bookingIndex !== -1) {
        bookings[bookingIndex].status = 'paid';
        bookings[bookingIndex].paymentStatus = 'paid';
        bookings[bookingIndex].razorpayPaymentId = razorpayPaymentId;
        bookings[bookingIndex].razorpayOrderId = razorpayOrderId;
        bookings[bookingIndex].paidAt = new Date().toISOString();
        
        await mysqlSaveCollection('bookings', 'bookings.json', bookings, 'id');
        
        // Send confirmation email
        await sendBookingConfirmation(bookings[bookingIndex]);
        
        console.log('[Payment] Verified and booking updated:', bookingId);
      }
    }
    
    res.json({ success: true, message: 'Payment verified' });
  } catch (err) {
    console.error('[Payment] Verification failed:', err);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
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