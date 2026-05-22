import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

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

// Secular simulated data for booking validations if needed at the backend
app.post("/api/chat", async (req, res) => {
  const { messages, customApiKey } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

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
    // Standard role translation: sender 'user' -> 'user', 'pandit' -> 'model'
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
        systemInstruction: PANDIT_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const responseText = response.text || "Pranam. Connecting to cosmic energy, let me meditate and reply shortly.";
    res.json({ text: responseText });

  } catch (error: any) {
    console.error("Gemini server-side broker failure:", error);
    
    // Graceful degradation when the API key is not present or is placeholder, matching security goals
    let fallbackText = "Pranam. I am Pandit Shastri Dev. Seeking your spiritual peace. ";
    
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
