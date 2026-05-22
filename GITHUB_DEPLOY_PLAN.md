# 🚀 Sacred Mandir GitHub Launch Masterplan

This guide details exactly how to deploy the **Pooja4Panditji** Vedic applet successfully from your GitHub repository so that all features (including user authentication, online bookings, and Pandit Ji's AI Chatbot) work flawlessly page-by-page.

---

## 🏛️ Architecture Breakdown

Pooja4Panditji is designed as a **Full-Stack Application** utilizing:
1. **Frontend Client:** React 18 + Vite styled with Tailwind CSS utility grids.
2. **Backend Gateway:** Node.js + Express (`server.ts`) which acts as a secure, insulated proxy for Gemini AI requests so that your private `GEMINI_API_KEY` is **never** leaked to the devotee's browser.

Because **GitHub Pages** only hosts stable, static files (`.html`, `.js`, `.css`), you have two professional methods for launching this website:

---

### 🌟 METHOD A: Universal Full-Stack Deploy (Highly Recommended)
Deploy the repository directly to a hosting provider that automatically supports custom backend Node.js runtimes. 

#### Recommended Free-Tier Hosts:
* **Render:** (https://render.com) — Best suited for standalone full-stack GitHub repositories.
* **Railway:** (https://railway.app) — Rapid instant setup with lightning-fast builds.
* **Render/Cloud Run:** — Enterprise-grade deployment.

#### Steps to Deploy on Render/Railway:
1. **Push to GitHub:** Create a new GitHub repository and push your entire codebase.
2. **Link Repo:** Log into Render or Railway and select **"New Web Service"** ➡️ connect your GitHub repository.
3. **Configure Building Actions:**
   * **Build Command:** `npm run build` (This bundles Vite static files into `/dist` and compiles `server.ts` into `/dist/server.cjs` securely).
   * **Start Command:** `npm run start` (Starts the compiled production Express server).
4. **Environment Secrets:**
   * Navigate to the **Environment Variables** tab of your dashboard.
   * Add a new key: `GEMINI_API_KEY` and paste your Google AI Studio API key (starts with `AIza...`).
   * No client keys are needed! The application will load, bind to port `10000` (or Railway's environment port), and handle server proxy actions beautifully.

---

### 🌐 METHOD B: Static Client on GitHub Pages + Separate Backend Server
If you strictly want to use **GitHub Pages** to host the visual interface, you must configure the frontend to talk to a separate backend server (e.g., hosted on Render or standard API servers).

#### Steps to Publish on GitHub Pages:
1. **Prepare static routing:** In `vite.config.ts`, include `base: '/<your-repository-name>/'` if deploying to `<username>.github.io/<repository-name>`.
2. **Setup static building:** Run `npm run build` locally. It compiles the React app into `/dist`.
3. **Publish to `gh-pages` branch:**
   * Install the deploy tool: `npm install gh-pages --save-dev`
   * Add scripts to `package.json`:
     ```json
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
     ```
   * Execute deployment commands:
     ```bash
     npm run deploy
     ```
4. **Backend Setup:**
   * Host your Express `server.ts` file on a free Render service.
   * In `src/App.tsx`, change your local fetch URL from `fetch('/api/chat')` to `fetch('https://your-custom-backend.onrender.com/api/chat')`.
   * Enable **CORS (Cross-Origin Resource Sharing)** on your backend `server.ts` to permit logins and analytics requests from your GitHub Pages URL:
     ```typescript
     import cors from 'cors';
     app.use(cors({ origin: 'https://<your-username>.github.io' }));
     ```

---

## 🔒 Security Best Practices

1. **Protect your key:** Never hardcode your `GEMINI_API_KEY` into `src/App.tsx` or any client-side files. GitHub crawlers scan files and will automatically deactivate leaked keys.
2. **Local Storage Persistence:** Devotee profiles and booking settlements are saved in client-side standard browser index systems (`localStorage`), meaning devotees will keep their logins alive safely without needing expensive cloud databases.
3. **CORS Headers:** If doing cross-origin hosting (Method B), restrict allowed origins strictly to your production URL.

---

## 📅 Testing Your Live Setup
Once deployed, verify your setup follows this validation ritual:
1. **Devotee Onboarding:** Sign up a test user in the **Sign In** header button. Give a temporary Gotra and Janma Nakshatra.
2. **Checkout Flow:** Select any Puja (e.g. *Durga Saptashati*), choose the basic package, and checkout. Notice how contact and astrological gotra elements **automatically populate** from your session!
3. **Secure Settlement:** Complete the simulation. Open the **Admin Portal** (using passcode `108`).
4. **Management & Reports:** Go to the **Devotee Accounts Logs** tab. Your newly registered devotee will be listed cleanly. Click **"Booking Settlements Report"** to download the CSV report. It opens natively in MS Excel or Google Sheets for instant offline bookkeeping!

May your launching ritual be highly auspicious and successful! ॐ
