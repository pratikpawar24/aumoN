"""
AUMO AI Routing Engine - Main FastAPI Application
Deployed on Hugging Face Spaces
"""
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any
import uvicorn
import traceback
from datetime import datetime

from models.emission_model import EmissionModel
from models.traffic_predictor import TrafficPredictor
from models.carpool_matcher import CarpoolMatcher
from models.graph_engine import GraphEngine
from algorithms.carbon_router import CarbonRouter, OPTIMIZATION_PROFILES
from utils.osm_parser import fetch_pois, nominatim_search, nominatim_reverse
from utils.geo_utils import bounding_box, haversine
from utils import tomtom

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AUMO AI Routing Engine",
    description="Carbon-aware route optimization with smart carpooling",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Initialize Services ──────────────────────────────────────────────────────
emission_model   = EmissionModel()
traffic_predictor = TrafficPredictor()
carpool_matcher  = CarpoolMatcher()
carbon_router    = CarbonRouter()
graph_engine     = GraphEngine()

# ─── Pydantic Models ──────────────────────────────────────────────────────────
class Coordinate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    vehicle_type: str = Field(default="car", pattern="^(car|electric|bus|bike|walk|motorcycle)$")
    optimize_for: str = Field(default="carbon", pattern="^(carbon|time|distance|balanced)$")
    departure_time: Optional[str] = "08:00"
    avoid_congestion: bool = True
    max_detour_percent: float = Field(default=15.0, ge=0, le=50)

class PassengerRequest(BaseModel):
    id: str
    pickup: Coordinate
    dropoff: Coordinate
    departure_time: str = "08:00"
    preferences: Optional[Dict[str, Any]] = {}

class CarpoolRequest(BaseModel):
    passengers: List[PassengerRequest]
    max_detour_minutes: int = Field(default=10, ge=0, le=60)
    max_passengers_per_vehicle: int = Field(default=4, ge=2, le=8)
    optimize_for: str = "carbon"
    time_window_minutes: int = Field(default=30, ge=5, le=120)

class TrafficRequest(BaseModel):
    lat: float
    lng: float
    radius_km: float = Field(default=5.0, ge=0.5, le=20.0)
    hour: Optional[int] = None

class EmissionRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    vehicle_type: str = "car"
    avg_speed_kmh: float = Field(default=40.0, ge=1, le=200)
    congestion_level: Optional[str] = None

class RouteSegment(BaseModel):
    distance_km: float
    avg_speed_kmh: float = 40.0
    congestion_level: Optional[str] = None

class RouteEmissionRequest(BaseModel):
    segments: List[RouteSegment]
    vehicle_type: str = "car"

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AUMO AI Routing Engine",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "traffic_predictor": traffic_predictor.is_trained,
            "emission_model": True,
            "carpool_matcher": True,
            "carbon_router": True,
        }
    }

# ─── Route Optimization ───────────────────────────────────────────────────────
@app.post("/api/route/optimize")
async def optimize_route(request: RouteRequest):
    """
    Carbon-aware route optimization.
    
    Implements Dijkstra's + A* with carbon-weighted edges.
    Returns primary route + alternatives ranked by carbon efficiency.
    """
    try:
        origin = (request.origin.lat, request.origin.lng)
        destination = (request.destination.lat, request.destination.lng)

        # Build bounding box
        all_lats = [origin[0], destination[0]]
        all_lngs = [origin[1], destination[1]]
        padding = 0.02  # ~2km padding
        south = min(all_lats) - padding
        north = max(all_lats) + padding
        west  = min(all_lngs) - padding
        east  = max(all_lngs) + padding

        # Build graph from OSM data
        graph_data = graph_engine.build_graph_from_bbox(
            south, west, north, east, request.vehicle_type
        )
        graph = graph_data['graph']
        node_coords = graph_data['node_coords']

        if not graph:
            raise HTTPException(status_code=503, detail="Could not build road network graph")

        # Find nearest nodes to origin/destination
        source_node = graph_engine.find_nearest_node(*origin)
        target_node = graph_engine.find_nearest_node(*destination)

        if not source_node or not target_node:
            raise HTTPException(status_code=404, detail="Could not find nodes near origin/destination")

        # Get traffic predictions
        hour = datetime.now().hour
        if request.departure_time:
            try:
                hour = int(request.departure_time.split(':')[0])
            except Exception:
                pass

        traffic_data = {}
        traffic_overlay = []  # for frontend rendering
        if request.avoid_congestion:
            # If TomTom is configured, sample real flow inside the route bbox.
            # Always also keep the synthetic predictor running so we have data
            # to render even when TomTom is rate-limited or unconfigured.
            tomtom_samples = tomtom.sample_flow_in_bbox(south, west, north, east, grid=4)
            traffic_overlay = [
                {
                    'lat': s['lat'],
                    'lng': s['lng'],
                    'predicted_speed_kmh': s['current_speed_kmh'],
                    'free_flow_speed_kmh': s['free_flow_speed_kmh'],
                    'congestion_level': s['congestion_level'],
                    'source': 'tomtom',
                }
                for s in tomtom_samples
            ]

            traffic_segments = traffic_predictor.get_congestion_map(
                request.origin.lat, request.origin.lng, radius_km=10.0, hour=hour
            )
            for seg in traffic_segments:
                traffic_data[seg['id']] = {'speed_kmh': seg['predicted_speed_kmh']}

            # If we got TomTom data, fold it into traffic_data too. The keys
            # used here are pseudo-edge IDs. Without per-edge correlation, we
            # blend by injecting nearest-edge speed overrides via the segment
            # samples — rough but better than synthetic-only.
            if not traffic_overlay:
                traffic_overlay = [
                    {
                        'lat': s['lat'],
                        'lng': s['lng'],
                        'predicted_speed_kmh': s['predicted_speed_kmh'],
                        'free_flow_speed_kmh': s['free_flow_speed_kmh'],
                        'congestion_level': s['congestion_level'],
                        'source': 'synthetic',
                    }
                    for s in traffic_segments
                ]

        # Optimize route
        result = carbon_router.optimize_route(
            graph=graph,
            node_coords=node_coords,
            source=source_node,
            target=target_node,
            vehicle_type=request.vehicle_type,
            optimize_for=request.optimize_for,
            traffic_data=traffic_data if traffic_data else None,
            max_detour_percent=request.max_detour_percent,
            use_astar=True
        )

        if 'error' in result:
            # Fallback: straight-line haversine estimate. Frontend depends on
            # always getting a route shape back, so we never raise here.
            dist = haversine(*origin, *destination)
            speed = 40.0
            time_min = (dist / speed) * 60
            ef = emission_model.get_base_emission_factor(request.vehicle_type)
            emission = dist * ef
            baseline = dist * 150.0
            saved = max(0.0, baseline - emission)
            savings_pct = (saved / baseline) * 100.0 if baseline > 0 else (
                100.0 if request.vehicle_type in ('bike', 'walk') else 0.0
            )

            return {
                'primary_route': {
                    'path': [source_node, target_node],
                    'route_geometry': [list(origin), list(destination)],
                    'total_distance_km': round(dist, 3),
                    'total_time_minutes': round(time_min, 2),
                    'total_emissions_g': round(emission, 2),
                    'baseline_emission_g': round(baseline, 2),
                    'carbon_saved_g': round(saved, 2),
                    'co2_savings_percent': round(savings_pct, 1),
                    'green_score': round(max(0.0, min(100.0, savings_pct)), 1),
                    'label': OPTIMIZATION_PROFILES[request.optimize_for]['label'],
                    'color': OPTIMIZATION_PROFILES[request.optimize_for]['color'],
                    'profile': request.optimize_for,
                    'vehicle_type': request.vehicle_type,
                    'fallback': True
                },
                'alternatives': [],
                'modal_comparison': carbon_router._get_modal_comparison(dist, time_min),
                'optimization_profile': request.optimize_for,
            }

        # Add route geometry to primary route
        primary = result['primary_route']
        primary['route_geometry'] = graph_engine.get_route_geometry(primary.get('path', []))

        # Add geometry to alternatives
        for alt in result.get('alternatives', []):
            alt['route_geometry'] = graph_engine.get_route_geometry(alt.get('path', []))

        # Generate turn-by-turn instructions
        instructions = carbon_router.generate_route_instructions(
            primary.get('path', []), node_coords, graph
        )
        primary['instructions'] = instructions

        # Traffic conditions along route — when TomTom is configured, sample
        # real flow at points along the chosen polyline so the frontend can
        # color-code segments. Falls back to synthetic when key is missing.
        polyline = primary.get('route_geometry') or []
        coord_pairs = [(c[0], c[1]) for c in polyline if c and len(c) >= 2]
        if coord_pairs and tomtom.is_configured():
            primary['traffic_along_route'] = tomtom.sample_flow_along_path(
                coord_pairs, samples=10
            )
        else:
            primary['traffic_along_route'] = []

        primary['traffic_conditions'] = [
            {
                'location': graph_engine.node_coords.get(nid, (0, 0)),
                'congestion': 'moderate'
            }
            for nid in primary.get('path', [])[::5]  # Sample every 5 nodes
        ]

        result['traffic_overlay'] = traffic_overlay
        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

# ─── Carpool Matching ─────────────────────────────────────────────────────────
@app.post("/api/carpool/match")
async def match_carpool(request: CarpoolRequest):
    """
    Smart carpool matching using DBSCAN spatial-temporal clustering.
    
    Process: Clustering → Preference Filter → Graph Matching → Route Optimization
    """
    try:
        passengers = [p.dict() for p in request.passengers]
        
        # Convert Coordinate objects
        for p in passengers:
            p['pickup'] = {'lat': p['pickup']['lat'], 'lng': p['pickup']['lng']}
            p['dropoff'] = {'lat': p['dropoff']['lat'], 'lng': p['dropoff']['lng']}

        result = carpool_matcher.match_passengers(
            requests=passengers,
            max_detour_minutes=request.max_detour_minutes,
            max_per_vehicle=request.max_passengers_per_vehicle,
            time_window_minutes=request.time_window_minutes
        )

        # Calculate shared routes for each group
        for group in result.get('groups', []):
            shared_route = carpool_matcher.calculate_shared_route(
                group, vehicle_type='car'
            )
            group['shared_route'] = shared_route

        return result

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Carpool matching failed: {str(e)}")

# ─── Traffic Prediction ───────────────────────────────────────────────────────
@app.post("/api/traffic/predict")
async def predict_traffic(request: TrafficRequest):
    """Predict traffic conditions around a location."""
    try:
        hour = request.hour if request.hour is not None else datetime.now().hour
        day = datetime.now().weekday()
        
        segments = traffic_predictor.get_congestion_map(
            request.lat, request.lng, request.radius_km, hour
        )
        
        return {
            'location': {'lat': request.lat, 'lng': request.lng},
            'radius_km': request.radius_km,
            'predicted_at': datetime.utcnow().isoformat(),
            'hour': hour,
            'day_of_week': day,
            'segments': segments,
            'summary': _summarize_traffic(segments)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Live Traffic Flow (TomTom) ───────────────────────────────────────────────
@app.get("/api/traffic/flow")
async def traffic_flow(
    south: float = Query(..., ge=-90, le=90),
    west: float = Query(..., ge=-180, le=180),
    north: float = Query(..., ge=-90, le=90),
    east: float = Query(..., ge=-180, le=180),
    grid: int = Query(default=4, ge=2, le=8),
):
    """
    Live traffic flow inside a bounding box, sampled on a grid via TomTom.
    When TOMTOM_API_KEY is unset, returns the synthetic predictor fallback so
    the frontend can still render an overlay.
    """
    if north <= south or east <= west:
        raise HTTPException(status_code=400, detail="Invalid bbox")

    if tomtom.is_configured():
        samples = tomtom.sample_flow_in_bbox(south, west, north, east, grid=grid)
        if samples:
            return {
                'source': 'tomtom',
                'segments': [
                    {
                        'lat': s['lat'],
                        'lng': s['lng'],
                        'predicted_speed_kmh': s['current_speed_kmh'],
                        'free_flow_speed_kmh': s['free_flow_speed_kmh'],
                        'congestion_level': s['congestion_level'],
                    } for s in samples
                ],
            }

    # Fallback to synthetic predictor centered at bbox midpoint.
    cx = (south + north) / 2.0
    cy = (west + east) / 2.0
    hour = datetime.now().hour
    segments = traffic_predictor.get_congestion_map(cx, cy, radius_km=5.0, hour=hour)
    return {'source': 'synthetic', 'segments': segments}


def _summarize_traffic(segments: List[dict]) -> dict:
    """Summarize traffic conditions."""
    if not segments:
        return {}
    levels = [s.get('congestion_level', 'moderate') for s in segments]
    level_counts = {}
    for l in levels:
        level_counts[l] = level_counts.get(l, 0) + 1
    dominant = max(level_counts, key=level_counts.get)
    avg_speed = sum(s.get('predicted_speed_kmh', 40) for s in segments) / len(segments)
    return {
        'dominant_congestion': dominant,
        'average_speed_kmh': round(avg_speed, 1),
        'segment_count': len(segments),
        'congestion_distribution': level_counts
    }

# ─── Emission Estimation ──────────────────────────────────────────────────────
@app.post("/api/emissions/estimate")
async def estimate_emissions(request: EmissionRequest):
    """Estimate CO2 emissions for a trip."""
    try:
        result = emission_model.calculate_segment_emission(
            request.distance_km,
            request.vehicle_type,
            request.avg_speed_kmh,
            request.congestion_level
        )
        baseline = request.distance_km * 150.0
        result['green_score'] = emission_model.calculate_green_score(
            result['emission_g'], baseline
        )
        result['baseline_g'] = round(baseline, 2)
        result['modal_comparison'] = carbon_router._get_modal_comparison(
            request.distance_km, (request.distance_km / request.avg_speed_kmh) * 60
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emissions/route")
async def estimate_route_emissions(request: RouteEmissionRequest):
    """Estimate total emissions for a multi-segment route."""
    try:
        segments_data = [s.dict() for s in request.segments]
        result = emission_model.calculate_route_emission(segments_data, request.vehicle_type)
        baseline = result['total_distance_km'] * 150.0
        result['green_score'] = emission_model.calculate_green_score(
            result['total_emission_g'], baseline
        )
        result['carbon_saved_g'] = round(max(0, baseline - result['total_emission_g']), 2)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emissions/factors")
async def get_emission_factors():
    """Get emission factors for all vehicle types."""
    from models.emission_model import EMISSION_FACTORS, CONGESTION_MULTIPLIERS
    return {
        'emission_factors': EMISSION_FACTORS,
        'congestion_multipliers': CONGESTION_MULTIPLIERS,
        'unit': 'g CO2 per km'
    }

# ─── POI & Geocoding ──────────────────────────────────────────────────────────
@app.get("/api/pois")
async def get_pois(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(default=1000, ge=100, le=5000)
):
    """Get Points of Interest near a location."""
    try:
        pois = fetch_pois(lat, lng, radius_m)
        return {'pois': pois, 'count': len(pois), 'center': {'lat': lat, 'lng': lng}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/geocode/search")
async def geocode_search(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=10, ge=1, le=20)
):
    """Search locations by name/address."""
    try:
        results = nominatim_search(q, limit)
        return {'results': results, 'count': len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/geocode/reverse")
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180)
):
    """Reverse geocode a coordinate to address."""
    try:
        result = nominatim_reverse(lat, lng)
        if not result:
            raise HTTPException(status_code=404, detail="No address found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Green Score ──────────────────────────────────────────────────────────────
@app.get("/api/green-score")
async def get_green_score(
    actual_emission_g: float = Query(..., ge=0),
    baseline_emission_g: float = Query(..., ge=0)
):
    """Calculate green mobility score."""
    score = emission_model.calculate_green_score(actual_emission_g, baseline_emission_g)
    carbon_saved = max(0, baseline_emission_g - actual_emission_g)
    return {
        'green_score': score,
        'actual_emission_g': actual_emission_g,
        'baseline_emission_g': baseline_emission_g,
        'carbon_saved_g': round(carbon_saved, 2),
        'rating': _score_rating(score),
        'annual_estimate': emission_model.estimate_annual_savings(actual_emission_g)
    }

def _score_rating(score: float) -> str:
    if score >= 80: return 'Excellent 🌟'
    if score >= 60: return 'Good 🟢'
    if score >= 40: return 'Average 🟡'
    if score >= 20: return 'Poor 🟠'
    return 'Very Poor 🔴'

# ─── Carpool Savings ──────────────────────────────────────────────────────────
@app.post("/api/carpool/savings")
async def calculate_carpool_savings(
    individual_emissions_g: List[float] = Body(...),
    shared_emission_g: float = Body(...),
    num_passengers: int = Body(...)
):
    """Calculate CO2 savings from carpooling."""
    try:
        return emission_model.calculate_carpool_savings(
            individual_emissions_g, shared_emission_g, num_passengers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")