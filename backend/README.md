# AUMO Backend API

Node.js/Express backend deployed on Render.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/profile` | Yes | Get profile |
| POST | `/api/routes/calculate` | Optional | Calculate optimized route |
| GET | `/api/routes/history` | Yes | Trip history |
| POST | `/api/carpool/request` | Yes | Create carpool request |
| GET | `/api/carpool/available` | Yes | Available rides |
| GET | `/api/map/search` | No | Location search |
| GET | `/api/map/pois` | No | Points of interest |
| GET | `/api/emissions/stats` | Yes | Carbon stats |
| GET | `/api/emissions/leaderboard` | No | Green leaderboard |
| GET | `/health` | No | Health check |

## Deploy on Render

1. Connect GitHub repo to Render
2. Set environment variables
3. Deploy — Render uses `render.yaml`