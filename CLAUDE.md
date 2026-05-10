# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a **three-service polyrepo-in-monorepo**: each service has its own toolchain, lockfile, and deploy target. There is no shared package manager / workspace at the root.

- `frontend/` — React 18 (CRA) + Tailwind + Leaflet + Socket.IO client. Deployed to Vercel.
- `backend/` — Node 18+ / Express + Mongoose + Socket.IO + JWT. Deployed to Render. **Mostly an auth/persistence layer that proxies heavy compute to the AI service.**
- `ai-routing/` — Python 3.10+ / FastAPI. Implements the actual routing algorithms (Dijkstra, A*, carbon-aware multi-objective optimization, DBSCAN carpool clustering, traffic prediction). Deployed to Hugging Face Spaces (Docker SDK).

Note: the working tree is nested as `AUMON/AUMON/` — commands below assume cwd is the inner `AUMON/` (the one with `docker-compose.yml`).

## Common Commands

### Local dev (three terminals)

```bash
# AI service (port 7860) — start this first; backend depends on it
cd ai-routing && pip install -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 7860 --reload

# Backend (port 5000) — needs MONGODB_URI + JWT_SECRET in backend/.env
cd backend && npm install && npm run dev

# Frontend (port 3000)
cd frontend && npm install && npm start
```

### Docker (all three at once)
```bash
docker-compose up --build       # reads MONGODB_URI / JWT_SECRET / ORS_API_KEY from root .env
```

### Tests
There are **no real tests** in this repo. `backend/package.json` has `"test": "echo \"Tests pending\" && exit 0"` and `frontend` runs `react-scripts test --passWithNoTests`. Don't claim tests pass as evidence of correctness — they don't run anything.

### API docs
FastAPI auto-generates docs at `http://localhost:7860/docs` (Swagger) and `/redoc`. Use these to explore the AI service contract — they are the most authoritative spec.

## Architecture

### Request flow for the headline feature (route optimization)

```
Frontend (MapPage / useRoute hook)
  → axios `aiApi` (services/api.js)        ── direct call ──→  ai-routing /api/route/optimize
  → axios `api`   (services/api.js)        ── attach JWT  ──→  backend /api/routes/*  (history, persistence)
                                                                  └─ aiProxyService.js → ai-routing (server-side proxy)
```

Two important consequences:
1. **The frontend talks to the AI service directly** via a second axios instance (`aiApi` in `frontend/src/services/api.js`), not only through the backend. So the AI service must be reachable from the browser and have permissive CORS — it currently uses `allow_origins=["*"]`.
2. **The backend duplicates AI endpoints** under `/api/ai/*` via `aiProxyService.js`. Some controllers (`routeController`, `carpoolController`, etc.) also call the AI service server-side and persist results to Mongo. When changing an AI endpoint contract, check both `frontend/src/services/aiService.js` and `backend/src/services/aiProxyService.js`.

### Backend structure

`server.js` mounts the route modules and wires Socket.IO. Routers live under `src/routes/*Routes.js` and follow a strict `route → controller → service → model` layering:

- `controllers/` — thin HTTP glue (validation handled by `middleware/validator.js`, auth by `middleware/auth.js`'s `protect`).
- `services/` — business logic. `aiProxyService.js` is the single chokepoint for all calls to the FastAPI service (timeout 30s, returns `{success, data|error, status}`).
- `models/` — Mongoose schemas: `User`, `Route`, `Ride`, `CarpoolRequest`, `CarpoolMatch`, `EmissionLog`, `TrafficData`.
- `config/env.js` — fails fast if `MONGODB_URI` or `JWT_SECRET` are missing; warns on optional vars.

Socket.IO rooms are keyed `carpool_<matchId>`; `app.set('io', io)` so controllers can emit via `req.app.get('io')`.

### AI service structure

`app.py` is a single FastAPI module that wires Pydantic request models to four engines:

- `algorithms/carbon_router.py` — multi-objective weighting `α·time + β·emissions + γ·distance` with four named profiles in `OPTIMIZATION_PROFILES` (carbon / time / distance / balanced). Calls into `dijkstra.py` or `astar.py`. **When adding a new optimization mode, update both the profile dict and the `RouteRequest.optimize_for` regex pattern in `app.py`.**
- `algorithms/cluster.py` — DBSCAN spatial-temporal clustering for carpool matching (eps≈2km, min_samples=2).
- `models/graph_engine.py` — builds road network from OSM via Overpass on demand, given a bounding box derived from origin/destination ± ~2km padding.
- `models/emission_model.py` — emission factors per `(vehicle_type, congestion_level)`. Baseline for "carbon saved" calculations is hardcoded as `distance_km × 150` (gasoline car).
- `models/traffic_predictor.py` — ML traffic speed predictor; feeds `traffic_data` into the router for congestion-aware edge weights.

The route endpoint has a **fallback path**: if `carbon_router.optimize_route` returns `{'error': ...}` (graph build failed), it returns a straight-line haversine estimate marked `fallback: true` instead of raising. Preserve this behavior — frontend depends on always getting a route shape back.

### Frontend structure

- `App.jsx` wraps everything in `ErrorBoundary → ThemeProvider → AuthProvider → MapProvider → Router`. Order matters: `MapProvider` reads from `AuthContext`.
- Route protection via `<ProtectedRoute>` checks `useAuth().isAuthenticated`; redirects to `/login`. Public pages: `/`, `/map`, `/about`, `/login`, `/register`. Protected: `/carpool`, `/dashboard`, `/profile`.
- JWT stored in `localStorage` as `aumo_token` (user object as `aumo_user`). The axios response interceptor in `services/api.js` clears both and force-redirects to `/login` on 401 — don't add a second redirect path elsewhere.
- Two axios instances: `api` (backend, attaches JWT) and `aiApi` (AI service, no auth, longer 45s timeout).

## Environment variables

| Service | Required | Optional |
|---|---|---|
| backend | `MONGODB_URI`, `JWT_SECRET` | `AI_SERVICE_URL` (default `http://localhost:7860`), `FRONTEND_URL`, `ORS_API_KEY`, `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN` |
| frontend | `REACT_APP_API_URL`, `REACT_APP_AI_URL` | `REACT_APP_MAP_STYLE` |
| ai-routing | — | `PORT` |

`backend/src/config/env.js` `process.exit(1)`s on missing required vars; don't try to make them optional without understanding why (mongo is non-optional for auth).

## Conventions worth knowing

- **No backend tests, no frontend tests, no linter beyond CRA's default ESLint.** Verification is manual / via the FastAPI `/docs` page and the `/health` endpoints on each service.
- The AI service uses `allow_origins=["*"]` because the frontend hits it directly from the browser. Don't tighten this without also routing those calls through the backend proxy.
- Emission baseline (150 g CO₂/km gasoline car) is hardcoded in three places: `carbon_router.py`, `app.py` fallback, and `app.py` emission endpoints. Keep them in sync.
- Optimization profile weights (α, β, γ) live in `OPTIMIZATION_PROFILES` in `algorithms/carbon_router.py` and are also documented in the README's algorithm section — update both if you change them.
