"""Data preprocessing utilities for AUMO AI service."""
import numpy as np
from typing import List, Dict, Optional, Tuple

def normalize_coordinates(
    lat: float, lng: float,
    lat_min: float = -90, lat_max: float = 90,
    lng_min: float = -180, lng_max: float = 180
) -> Tuple[float, float]:
    """Normalize coordinates to [0, 1] range."""
    lat_norm = (lat - lat_min) / (lat_max - lat_min)
    lng_norm = (lng - lng_min) / (lng_max - lng_min)
    return lat_norm, lng_norm

def parse_time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes from midnight."""
    try:
        parts = time_str.split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 480  # Default 8:00 AM

def prepare_route_features(route_data: dict) -> np.ndarray:
    """Prepare features for route ML models."""
    features = [
        route_data.get('distance_km', 0),
        route_data.get('speed_kmh', 40),
        parse_time_to_minutes(route_data.get('departure_time', '08:00')),
        1 if route_data.get('vehicle_type') == 'car' else 0,
        1 if route_data.get('vehicle_type') == 'electric' else 0,
        1 if route_data.get('vehicle_type') == 'bus' else 0,
    ]
    return np.array(features).reshape(1, -1)

def compute_route_statistics(routes: List[dict]) -> dict:
    """Compute aggregate statistics across multiple routes."""
    if not routes:
        return {}
    emissions = [r.get('total_emissions_g', 0) for r in routes]
    distances = [r.get('total_distance_km', 0) for r in routes]
    times = [r.get('total_time_minutes', 0) for r in routes]
    return {
        'avg_emission_g': np.mean(emissions),
        'min_emission_g': np.min(emissions),
        'max_emission_g': np.max(emissions),
        'avg_distance_km': np.mean(distances),
        'avg_time_min': np.mean(times),
        'total_carbon_saved_g': sum(r.get('carbon_saved_g', 0) for r in routes),
    }