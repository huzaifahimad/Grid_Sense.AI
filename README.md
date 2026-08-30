<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Three.js-3D_Viz-000000?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Recharts-Data_Viz-22B5BF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

# ⚡ GridSense AI — Frontend Dashboard

**Interactive 3D Grid Intelligence Dashboard for Power Grid Risk Monitoring**

A premium dark-themed dashboard built with React, Three.js, and Recharts that visualizes real-time grid overload risk, demand forecasts, AI explainability (SHAP), and decision-support load-shedding schedules. Connects to the GridSense AI REST API backend.

---

## ✨ Features

### 🌐 3D Interactive Grid Topology
- Real-time animated substation nodes with risk-based color coding
- Transmission line network visualization with power flow indicators
- Interactive orbit controls — click any node to select a zone
- Pulsing animation on critical-risk nodes

### 📊 Monitored Asset Risk Rankings
- Sortable table ranked by overload risk score
- Visual load ratio gauges with color-coded thresholds
- Live temperature, capacity, and demand metrics
- Click-to-select zone interaction

### 📈 24-Hour Demand Forecast Chart
- LightGBM regression output with **P10/P50/P90 prediction intervals**
- Gradient-filled confidence bands
- Per-zone forecast with capacity reference line

### 🧠 SHAP Risk Explainability Panel
- Top contributing factors driving overload risk
- Horizontal bar chart with positive (risk-increasing) and negative (risk-reducing) impacts
- Real SHAP TreeExplainer values from the backend

### 🛡️ Load Shedding Decision Support
- Transparent reasoning engine explaining **why** shedding is recommended
- Severity classification (LOW / MODERATE / HIGH)
- Step-by-step feeder curtailment schedule with MW amounts and priority levels
- Explicitly labeled as **advisory only** — never autonomous

### 🔄 Demo / Live Mode Toggle
- **Demo Mode**: Rich mock data for offline demos and development
- **Live Mode**: Connects to the real GridSense AI REST API
- Controlled via `VITE_API_BASE_URL` and `VITE_USE_MOCK_DATA` environment variables

---

## 🎨 Design System

| Element | Specification |
|:--------|:-------------|
| Background | Deep navy `#0b0f19` with glassmorphism panels |
| Typography | Inter (body), Outfit (headings), JetBrains Mono (data) |
| Status: Safe | Emerald green `#10b981` with subtle glow |
| Status: Warning | Amber `#f59e0b` with medium glow |
| Status: Critical | Crimson `#ef4444` with pulsing border animation |
| Cards | Frosted glass with `backdrop-filter: blur(12px)` |
| Scrollbar | Custom dark-themed thin scrollbar |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000` in demo mode by default.

### 3. Connect to Live Backend

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_DATA=false
```

Or connect to a deployed Render backend:

```env
VITE_API_BASE_URL=https://your-gridsense-api.onrender.com
VITE_USE_MOCK_DATA=false
```

### 4. Production Build

```bash
npm run build
```

Output in `dist/` — 2,877 modules, ~430KB gzipped.

---

## 📁 Project Structure

```
├── public/
│   └── favicon.svg             # GridSense AI favicon
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root application component
│   ├── GridSenseDashboard.jsx  # Main dashboard (3D, charts, tables)
│   └── index.css               # Global styles, glassmorphism, animations
├── index.html                  # HTML template with Google Fonts
├── vite.config.js              # Vite build configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Dependencies and scripts
```

---

## 🔌 API Endpoints Consumed

| Endpoint | Purpose |
|:---------|:--------|
| `GET /` | Service status check & zone list |
| `GET /assets` | All zones ranked by risk score |
| `GET /risk/{zone}` | Risk score + SHAP top-3 factors for a zone |
| `GET /forecast/{zone}?horizon_hours=24` | P10/P50/P90 load forecast |
| `GET /shed-schedule/{zone}` | Load-shedding recommendation + reasoning |

---

## ☁️ Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import this GitHub repo
2. **Framework Preset**: Vite (auto-detected)
3. **Root Directory**: `.` (this repo IS the frontend root)
4. **Build Command**: `npm run build` (auto-detected)
5. **Output Directory**: `dist` (auto-detected)
6. Go to **Project Settings** → **Environment Variables** and add:
   - `VITE_API_BASE_URL` = your live Render backend URL (e.g. `https://gridsense-api.onrender.com`)
   - `VITE_USE_MOCK_DATA` = `false`
7. **Deploy**

> 💡 If you see the "API ERROR" banner, check:
> - Is the Render backend awake? (visit the Render URL directly to wake it from cold start)
> - Does `VITE_API_BASE_URL` exactly match your Render URL including `https://`?
> - Open browser DevTools → Network tab to see the actual failing request

---

## 🖥️ Environment Variables

| Variable | Default | Description |
|:---------|:--------|:------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | GridSense AI backend REST API URL |
| `VITE_USE_MOCK_DATA` | `true` | Set to `false` to use live API data |

Both are read via `import.meta.env` (Vite standard).

---

## ⚠️ Known Limitations

- The 3D topology is a **representative visualization** of 3 European zones — not a geographically accurate grid map
- CORS on the backend is currently `allow_origins=["*"]` — tighten to your Vercel domain for production
- Three.js bundle contributes ~1.5MB pre-gzip to the JS bundle — consider code-splitting for performance optimization
- Demo mode mock data is hardcoded in `GridSenseDashboard.jsx` — not fetched from any file

---

## 📚 Companion Backend

The FastAPI ML backend (data pipeline, model training, REST API) lives in a separate repo:
**[Grid_Sense.AI-Backend-](https://github.com/huzaifahimad/Grid_Sense.AI-Backend-)**

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.
