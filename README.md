# 🌿 EcoMetrics

![EcoMetrics Hero Image](https://via.placeholder.com/1200x400/0f172a/10b981?text=EcoMetrics+-+Make+Sustainability+Actionable)

**DevLeague 2026 Hackathon Submission**
* **Target Lab:** Lab 3 (Operational Sustainability & ESG)
* **Bonus Track:** Solana Web3 Track

---

## 🎯 The Problem
Business owners are required to track and reduce their carbon footprint, but the data is trapped in messy paper utility bills and logistics invoices. Tracking ESG goals is currently a slow, manual, and unmeasurable process for most SMEs in Southeast Asia.

## 💡 The Solution
**EcoMetrics** makes sustainability measurable and instantly actionable. It is an AI-powered dashboard that extracts usage data from uploaded bills, calculates the exact carbon footprint, and offers a one-click offset via the Solana blockchain.

### 🚀 How it Works (The User Journey)
1. **Upload:** A business owner drops a PDF electricity or logistics bill into the dashboard.
2. **AI Extraction:** Our Vision AI instantly reads the text (e.g., "500 kWh used") and automatically calculates the exact carbon footprint in tons of CO2.
3. **The Solana Offset:** The user clicks "Offset on Solana" to trigger a frictionless micro-transaction to a verified tree-planting charity, offsetting their footprint instantly.
4. **ESG Reporting:** The user can instantly export their dashboard into a professional ESG compliance PDF.

---

## 🛠️ Built With

*   **Frontend:** React, Next.js (App Router)
*   **Styling:** Tailwind CSS, Framer Motion (Glassmorphism & Micro-animations)
*   **AI Engine:** Google Gemini Vision API
*   **Blockchain Integration:** Solana Web3 (Wallet Adapter)
*   **Data Export:** html2pdf.js

---

## 💻 Getting Started (Local Setup)

Want to run EcoMetrics locally? Follow these steps:

### Prerequisites
*   Node.js (v20+)
*   npm

### Option A — Node
1. **Clone the repository**
   ```bash
   git clone https://github.com/hzwnhrth/EcoMetrics.git
   cd EcoMetrics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local   # set GEMINI_API_KEY; SOLANA_SECRET_KEY optional
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **View the app**
   Open your browser and navigate to `http://localhost:3000`

### Option B — Docker (no Node required)
```bash
cp .env.example .env.local   # set GEMINI_API_KEY; SOLANA_SECRET_KEY optional
docker compose --profile prod up --build
```
Open http://localhost:3000 — the app boots pre-loaded with the demo dataset.
Created actions persist in ./data across restarts.
Note: without GEMINI_API_KEY the app is fully usable on the seeded data;
only live re-extraction of PDF/DOCX uploads needs the key. The Excel
re-upload demo (auto-verify) works with no keys at all.

For the team dev loop with hot reload, use `docker compose --profile dev up`
instead (plain `docker compose up` intentionally starts nothing).

---

## 👨‍💻 Team
Built with ❤️ for DevLeague 2026.
