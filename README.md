# 🌿 AUMO — AI-powered Urban Mobility Optimizer

Carbon-aware route optimization, smart carpooling, real-time traffic, GPS trip tracking, in-app chat, an admin console, and a graphical user dashboard — all wired to OpenStreetMap data and a small set of optional external APIs.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://aumo-frontend.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-blue?logo=render)](https://aumo-backend.onrender.com)
[![AI Engine](https://img.shields.io/badge/AI-HuggingFace-yellow?logo=huggingface)](https://huggingface.co/spaces/pratikpawar24/aumo-ai)

---

## Architecture

Three independent services in one repo. No shared workspace — each has its own toolchain.

```
┌───────────────────┬────────────────────┬─────────────────────────┐
│     Frontend      │      Backend       │   AI Routing Engine     │
│      Vercel       │       Render       │   Hugging Face Spaces   │
├───────────────────┼────────────────────┼─────────────────────────┤
│ React 18 + CRA    │ Node 18 / Express  │ Python 3.10 / FastAPI   │
│ Tailwind          │ MongoDB Atlas      │ Dijkstra + A* routing   │
│ Leaflet           │ JWT auth           │ DBSCAN carpool clusters │
│ Recharts          │ Socket.IO chat     │ ML traffic prediction   │
│ Socket.IO client  │ Mongoose           │ TomTom traffic flow     │
└───────────────────┴────────────────────┴─────────────────────────┘
```

The frontend talks to the AI service **directly** for route calculation (latency reasons) and to the backend for everything that needs persistence.

---

## Features

- **Carbon-aware routing** with four genuinely-different profiles (eco / fast / shortest / balanced) — road-type-aware emission multipliers ensure mode selection actually changes the path, not just its color.
- **Real-time traffic overlay** via TomTom Flow Segment Data, with the route polyline color-coded by congestion bucket.
- **GPS trip tracking** with live position, deviation detection (>50 m off planned route), and auto-reroute on consecutive deviations.
- **Smart carpooling** — DBSCAN spatial-temporal clustering, three-tab UI (Find / Schedule / History), fare-per-seat, in-app chat that auto-deletes 24 h after departure.
- **Email verification** via Brevo SMTP (OTP) — required to access carpool.
- **Profile pictures** with browser-side compression, optional Cloudinary upload (disk fallback when no key).
- **Admin console** at `/admin` for master + secondary admins — block/unblock users, audit log, live trip feed, per-user CO₂ chart.
- **Graphical dashboard** — Recharts grid showing CO₂ saved over time, vehicle distribution, time + cost saved per month, leaderboard.
- **Light/dark theme**, mobile-first responsive layouts, Indian-context defaults (₹, MapMyIndia-friendly bbox sampling).

---

## Algorithms

Carbon-aware multi-objective edge weight per OSM segment:

```
weight(edge) = α·time_min + β·(emission_g / 100) + γ·distance_km

emission_g = distance_km × EF_base × congestion_mult × road_type_mult × speed_factor
```

Profiles (α, β, γ) live in `ai-routing/algorithms/carbon_router.py`:

| Profile     | α (time) | β (emit) | γ (dist) | Tends to prefer       |
|-------------|----------|----------|----------|-----------------------|
| Eco         | 0.20     | 0.70     | 0.10     | Tertiary roads        |
| Fastest     | 0.70     | 0.20     | 0.10     | Motorway / trunk      |
| Shortest    | 0.10     | 0.20     | 0.70     | Direct geometry       |
| Balanced    | 0.33     | 0.34     | 0.33     | Compromise            |

Road-type emission multipliers (`ROAD_EMISSION_MULTIPLIER` in `algorithms/dijkstra.py`):

| Road class    | Multiplier | Why                                  |
|---------------|------------|--------------------------------------|
| motorway      | 1.30       | engine inefficiency above 100 km/h   |
| trunk         | 1.20       |                                      |
| primary       | 1.10       |                                      |
| tertiary      | 0.92       | eco sweet spot                       |
| residential   | 1.05       | stop-and-go                          |

Carpool matching uses DBSCAN with `eps ≈ 2 km`, `min_samples = 2` over (lat, lng, departure_minute).

---

## External APIs used

All keys are env-var-driven and **feature-flagged** — the app boots and runs without any of them. Missing keys degrade individual features gracefully.

| API                     | Purpose                              | Free tier             | Required env var(s)                                 |
|-------------------------|--------------------------------------|-----------------------|-----------------------------------------------------|
| **Brevo** (Sendinblue)  | Email OTP for verification           | 300 emails/day        | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| **TomTom Traffic**      | Live flow per coordinate             | 2 500 req/day         | `TOMTOM_API_KEY`                                    |
| **Cloudinary**          | Profile-picture hosting              | 25 GB storage/month   | `CLOUDINARY_URL`                                    |
| **OpenWeather**         | Current weather at origin            | 1 000 req/day         | `OPENWEATHER_API_KEY`                               |
| **Nominatim** (OSM)     | Geocoding + reverse-geocoding        | 1 req/s, fair use     | (no key)                                            |
| **Photon** (Komoot)     | Autocomplete                         | generous              | (no key)                                            |
| **Overpass** (OSM)      | POIs, buildings, bus stops           | 10 000 req/day        | (no key)                                            |
| **OpenStreetMap tiles** | Map raster tiles (CartoDB themes)    | unlimited             | (no key)                                            |
| **OpenRouteService**    | Optional fallback routing            | 2 000 req/day         | `ORS_API_KEY` (optional)                            |

### Provider setup notes

- **Brevo:** create a free account → SMTP & API → grab the SMTP key and login. `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`. Without it, the backend logs OTPs to stdout (`[DEV EMAIL FALLBACK]`) so you can finish the verify flow locally.
- **TomTom:** developer.tomtom.com → register → create a Maps & Traffic API key. Without it, the app falls back to the synthetic ML predictor for the polyline overlay.
- **Cloudinary:** cloudinary.com → dashboard → copy the `CLOUDINARY_URL` (cloudinary://api_key:api_secret@cloud_name). Without it, avatars save to `backend/uploads/avatars/`. Note: that disk doesn't survive a Render restart, so Cloudinary is the right choice for production.
- **OpenWeather:** openweathermap.org → register → free tier → copy `OPENWEATHER_API_KEY`. Without it, the route panel just doesn't show the weather chip.

---

## Environment variables

### `backend/.env`

```bash
# Required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random 32-byte hex>

# Optional
AI_SERVICE_URL=http://localhost:7860
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
JWT_EXPIRES_IN=7d
ORS_API_KEY=

# Phase 1 (email + uploads)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your Brevo SMTP login>
SMTP_PASS=<your Brevo SMTP key>
EMAIL_FROM=AUMO <no-reply@yourdomain.com>
CLOUDINARY_URL=cloudinary://...

# Phase 2 (traffic)
TOMTOM_API_KEY=<your TomTom key>

# Phase 4 (master admin seeding — set once, then leave alone)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<initial password — bcrypt-hashed at first boot>
ADMIN_NAME=AumoN Master Admin

# Phase 7
OPENWEATHER_API_KEY=<your OpenWeather key>
```

### `frontend/.env.local`

```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_AI_URL=http://localhost:7860
REACT_APP_VERSION=2.0.0
```

### `ai-routing` (env)

```bash
PORT=7860
TOMTOM_API_KEY=<same as backend>
```

---

## Local development

Three terminals, in order:

```bash
# AI service first (backend depends on it)
cd ai-routing
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860 --reload

# Backend
cd backend
cp .env.example .env   # populate with your values
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm start
```

Or via Docker compose at the repo root:

```bash
docker-compose up --build
```

Visit `http://localhost:3000`. FastAPI docs live at `http://localhost:7860/docs`.

---

## Deployment

| Service     | Platform                | Notes                                                    |
|-------------|-------------------------|----------------------------------------------------------|
| Frontend    | Vercel                  | Auto-deploys from `main`. Set the `REACT_APP_*` vars.    |
| Backend     | Render (Web Service)    | Auto-deploys from `main`. Set all backend env vars.      |
| AI Service  | Hugging Face Spaces     | Docker SDK. Pushed to a separate `hf` git remote.        |
| Database    | MongoDB Atlas           | Free tier; whitelist `0.0.0.0/0` for Render.             |

### First-time admin login

Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` on Render → restart → log in at `/login` with those credentials. The seeder upserts the master admin on every boot, so rotating `ADMIN_PASSWORD` in env and redeploying rotates the live password too.

---

## Suggested datasets for further testing

The algorithms here use OpenStreetMap data live, but if you want to evaluate accuracy or train better traffic models, the following datasets are worth a look:

- **OpenStreetMap Quality Metrics** — `https://osmstats.neis-one.org/` for India coverage stats.
- **India Traffic & Speed Data** — Indian Highways Authority of India (NHAI) FASTag transactions are partially open. For Maharashtra specifically, the **Mumbai Smart City** open-data portal (`opendata.mumbai.gov.in`) has bus and traffic feeds.
- **Vehicle Emission Factors** — IPCC AR6 WG3 Annex II.5 (per-mode CO₂/km), and India-specific ARAI emission inventory reports.
- **GPS trace datasets** — `OpenStreetCam` (now `KartaView`) provides crowdsourced street-level GPS traces; useful for benchmarking deviation-detection thresholds.
- **Nominatim search benchmarks** — the OSMnames project ships geocoding accuracy datasets.
- **Carpool ground-truth** — research papers like Santi et al. *"Quantifying the benefits of vehicle pooling with shareability networks"* publish evaluation traces from NYC taxi data; the Bangalore Mobility Survey (IISc) covers Indian commute patterns.

---

## Team

| Member         | Email                       |
|----------------|-----------------------------|
| Pratik Pawar   | pratikpawarpune@gmail.com   |
| Shruti Dalvi   | shrutidalvi8010@gmail.com   |
| Rohan Mane     | rohan.mane@dypic.in         |

---

## Known limitations

- No automated test suite. Verification is manual, via the FastAPI `/docs` page and `/health` endpoints on each service.
- TomTom integration is overlay-only — the routing graph itself still uses the synthetic ML predictor's speeds. Per-edge correlation between TomTom samples and OSM edges is future work.
- Time saved + cost saved on the dashboard are heuristics (25 km/h baseline vs actual; ₹8/km × CO₂-savings ratio), labeled "estimated" in the UI.
- Admin console runs in dark indigo only; doesn't follow the user-facing light/dark toggle.
- Map / Carpool / Dashboard / Home and the admin console use slightly different theming patterns — full token migration is incremental.
- Mobile responsiveness was statically applied; not validated on every device class.

---

## License

MIT — see `LICENSE`.

---

## Acknowledgments

OpenStreetMap contributors · Nominatim · Overpass · OSRM · TomTom Developer · Brevo · Cloudinary · OpenWeather · Hugging Face · Render · Vercel.
