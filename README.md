Yo
# 🌿 AUMO — AI-powered Urban Mobility Optimizer

> Carbon-aware route optimization, smart carpooling, and traffic prediction for sustainable urban mobility.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://aumo-frontend.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-blue?logo=render)](https://aumo-backend.onrender.com)
[![AI Engine](https://img.shields.io/badge/AI-HuggingFace-yellow?logo=huggingface)](https://huggingface.co/spaces/pratikpawar24/aumo-ai)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUMO System                             │
├──────────────┬──────────────────┬──────────────────────────────┤
│   Frontend   │     Backend      │      AI Routing Engine        │
│  (Vercel)    │    (Render)      │   (Hugging Face Spaces)       │
│              │                  │                              │
│ React App    │ Express/Node     │ FastAPI + Python             │
│ Leaflet Map  │ MongoDB Atlas    │ Dijkstra + A*                │
│ TailwindCSS  │ JWT Auth         │ DBSCAN Carpooling            │
│ Socket.IO    │ REST API         │ ML Traffic Prediction        │
└──────────────┴──────────────────┴──────────────────────────────┘
```

---

## 🧠 Algorithms (from Research Paper)

### Carbon-Aware Routing

```
E_total = Σ(d_i × EF_i)

Weight = α × norm_time + β × norm_emissions + γ × norm_distance
```

**Profiles:**

- Eco → α=0.2, β=0.7, γ=0.1  
- Fast → α=0.7, β=0.2, γ=0.1  
- Balanced → α=0.33, β=0.34, γ=0.33  

---

### Emission Factors (g CO₂/km)

| Vehicle   | Base EF | Free Flow | Moderate | Heavy | Gridlock |
|----------|--------|----------|---------|------|----------|
| Car       | 150    | 150      | 195     | 240  | 330      |
| Electric  | 55     | 55       | 71.5    | 88   | 121      |
| Bus/pax   | 90     | 90       | 117     | 144  | 198      |
| Bike/Walk | 0      | 0        | 0       | 0    | 0        |

---

### Smart Carpooling (DBSCAN)

**Process:**

1. Ride Requests from Users  
2. Spatial-Temporal Clustering *(DBSCAN, eps=2km, min_samples=2)*  
3. Preference Filter *(time window, detour limit, gender)*  
4. Vehicle-Passenger Matching *(nearest-neighbor heuristic)*  
5. Shared Route Optimization *(A* with traffic)*  

**Output:** Optimized Shared Routes

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js ≥ 18  
- Python ≥ 3.10  
- MongoDB Atlas account (free tier)  
- Git  

---

### 1. Clone the repository

```bash
git clone https://github.com/pratikpawar24/aumoN.git
cd aumoN
```

---

### 2. Run AI Service

```bash
cd ai-routing
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
# API docs: http://localhost:7860/docs
```

---

### 3. Run Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
# API: http://localhost:5000
```

---

### 4. Run Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your backend/AI URLs
npm install
npm start
# App: http://localhost:3000
```

---

### (Optional) Docker Setup

```bash
cp .env.example .env
# Edit .env with MONGODB_URI and JWT_SECRET
docker-compose up --build
```

---

## 🌐 API Reference

### Backend (Render)

| Method | Endpoint | Auth | Description |
|--------|--------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/profile | Yes | Get user profile |
| POST | /api/routes/calculate | Opt | Calculate carbon-aware route |
| GET | /api/routes/history | Yes | Trip history |
| POST | /api/carpool/request | Yes | Create carpool request |
| GET | /api/carpool/available | Yes | Browse available rides |
| GET | /api/map/search | No | Search locations |
| GET | /api/map/pois | No | Points of interest |
| GET | /api/map/bus-stops | No | Bus stops near location |
| GET | /api/emissions/stats | Yes | Personal emission stats |
| GET | /api/emissions/leaderboard | No | Green leaderboard |
| GET | /health | No | Health check |

---

### AI Service (Hugging Face)

| Method | Endpoint | Description |
|--------|---------|------------|
| POST | /api/route/optimize | Carbon-aware route optimization |
| POST | /api/carpool/match | DBSCAN carpool matching |
| POST | /api/traffic/predict | ML traffic prediction |
| POST | /api/emissions/estimate | CO₂ estimation |
| GET | /api/pois | Points of interest (Overpass) |
| GET | /api/geocode/search | Location search (Nominatim) |
| GET | /health | Health check |

---

## 🗺️ Free APIs Used

| API | Purpose | Rate Limit |
|-----|--------|-----------|
| Nominatim | Geocoding & reverse geocoding | 1 req/s |
| Photon | Fast autocomplete search | Generous |
| Overpass | POIs: buildings, shops, bus stops | 10k req/day |
| OSRM | Fallback routing & directions | Generous |
| OSM Tiles | Map tiles (dark, street, satellite) | Unlimited |
| OpenRouteService | Alternative routing (optional) | 2000 req/day |

---

## 📁 Project Structure

```
aumoN/
├── frontend/          
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── utils/
│   └── vercel.json
│
├── backend/           
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── middleware/
│   └── render.yaml
│
├── ai-routing/        
│   ├── app.py
│   ├── algorithms/
│   ├── models/
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 🚢 Deployment

### Frontend → Vercel
- Push to GitHub  
- Import project on vercel.com  
- Set environment variables:
  - REACT_APP_API_URL → your Render backend URL  
  - REACT_APP_AI_URL → your Hugging Face Space URL  
- Deploy ✅  

### Backend → Render
- Connect GitHub repo on render.com  
- Set environment variables  
- Auto-deploy via render.yaml ✅  

### AI Service → Hugging Face Spaces
- Create new Space  
- Set SDK to "Docker"  
- Push ai-routing/ folder ✅  

### Database → MongoDB Atlas
- Create free cluster  
- Create DB user  
- Whitelist 0.0.0.0/0  
- Add connection string to MONGODB_URI ✅  

---

## 🤝 Contributing

- Fork the repo  
- Create a branch (`git checkout -b feature/amazing-feature`)  
- Commit changes (`git commit -m 'Add amazing feature'`)  
- Push (`git push origin feature/amazing-feature`)  
- Open Pull Request  

---

## 📄 License

MIT License — see LICENSE for details.

---

## 🙏 Acknowledgments

- OpenStreetMap contributors  
- Nominatim, Overpass API, OSRM  
- Hugging Face  
- Render & Vercel  