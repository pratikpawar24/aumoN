---
title: AUMO AI Routing Engine
emoji: 🗺️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
---

# AUMO AI Routing Engine

Carbon-aware route optimization with smart carpooling for sustainable urban mobility.

## Features

- **Carbon-Aware Routing**: Dijkstra's + A* algorithms with emission-weighted edges
- **Formula**: E_total = Σ(d_i × EF_i) with congestion multipliers
- **Multi-Objective**: Optimize for carbon, time, distance, or balanced
- **Smart Carpooling**: DBSCAN spatial-temporal passenger clustering
- **Traffic Prediction**: ML-based congestion prediction
- **Free APIs**: Overpass (OSM), Nominatim geocoding

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/route/optimize` | Carbon-aware route optimization |
| POST | `/api/carpool/match` | Smart carpool matching |
| POST | `/api/traffic/predict` | Traffic prediction |
| POST | `/api/emissions/estimate` | CO2 estimation |
| GET  | `/api/pois` | Points of interest |
| GET  | `/health` | Health check |

## Algorithm

Weight = α × normalized_time + β × normalized_emissions + γ × normalized_distance

Profiles:
- **Eco**: α=0.2, β=0.7, γ=0.1
- **Fast**: α=0.7, β=0.2, γ=0.1  
- **Balanced**: α=0.33, β=0.34, γ=0.33
