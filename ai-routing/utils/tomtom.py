"""
TomTom Traffic API client.

Uses the Flow Segment Data API to fetch real-time per-point traffic flow.
Falls back to synthetic data when TOMTOM_API_KEY is not set, so the AI
service still works for local dev / unconfigured deploys.

Docs: https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data
"""
import os
import logging
import requests
from typing import List, Dict, Optional, Tuple

log = logging.getLogger(__name__)

TOMTOM_FLOW_URL = (
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/"
    "{style}/{zoom}/json"
)
DEFAULT_STYLE = "absolute"     # currentSpeed in km/h, freeFlowSpeed in km/h
DEFAULT_ZOOM = 10              # ~city-scale segments; 18 = lane-level


def is_configured() -> bool:
    return bool(os.getenv("TOMTOM_API_KEY"))


def _classify_congestion(current_kmh: float, free_flow_kmh: float) -> str:
    """Same buckets the rest of AUMO uses: free_flow / moderate / heavy / gridlock."""
    if free_flow_kmh <= 0:
        return "free_flow"
    ratio = current_kmh / free_flow_kmh
    if ratio >= 0.8:
        return "free_flow"
    if ratio >= 0.5:
        return "moderate"
    if ratio >= 0.25:
        return "heavy"
    return "gridlock"


def fetch_flow_at_point(
    lat: float,
    lng: float,
    style: str = DEFAULT_STYLE,
    zoom: int = DEFAULT_ZOOM,
    timeout: float = 4.0,
) -> Optional[Dict]:
    """Returns flow info for the road nearest the given point, or None on failure."""
    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        return None
    url = TOMTOM_FLOW_URL.format(style=style, zoom=zoom)
    try:
        r = requests.get(
            url,
            params={"point": f"{lat},{lng}", "key": api_key},
            timeout=timeout,
        )
        if r.status_code != 200:
            log.warning("TomTom flow %s for %s,%s: %s", r.status_code, lat, lng, r.text[:200])
            return None
        data = r.json().get("flowSegmentData") or {}
        current = float(data.get("currentSpeed", 0) or 0)
        freeflow = float(data.get("freeFlowSpeed", 0) or 0)
        return {
            "lat": lat,
            "lng": lng,
            "current_speed_kmh": current,
            "free_flow_speed_kmh": freeflow,
            "current_travel_time_s": data.get("currentTravelTime"),
            "free_flow_travel_time_s": data.get("freeFlowTravelTime"),
            "confidence": data.get("confidence"),
            "road_closure": data.get("roadClosure", False),
            "congestion_level": _classify_congestion(current, freeflow),
        }
    except requests.RequestException as e:
        log.warning("TomTom flow request failed at %s,%s: %s", lat, lng, e)
        return None


def sample_flow_in_bbox(
    south: float, west: float, north: float, east: float,
    grid: int = 4,
) -> List[Dict]:
    """
    Sample a grid of points across a bbox and fetch flow for each.

    grid=4 → 16 points → 16 API calls. TomTom free tier is 2500/day, 5/s,
    so this is well within budget for typical session use.
    """
    if not is_configured():
        return []

    points: List[Tuple[float, float]] = []
    for i in range(grid):
        for j in range(grid):
            t = (i + 0.5) / grid
            u = (j + 0.5) / grid
            lat = south + t * (north - south)
            lng = west + u * (east - west)
            points.append((lat, lng))

    results: List[Dict] = []
    for lat, lng in points:
        info = fetch_flow_at_point(lat, lng)
        if info:
            results.append(info)
    return results


def sample_flow_along_path(
    coords: List[Tuple[float, float]],
    samples: int = 8,
) -> List[Dict]:
    """
    Sample evenly-spaced points along a polyline and fetch flow for each.
    Used to color-code a route polyline.
    """
    if not is_configured() or not coords:
        return []
    n = len(coords)
    if n <= samples:
        picks = list(range(n))
    else:
        step = n / samples
        picks = [int(i * step) for i in range(samples)]
    results = []
    for idx in picks:
        lat, lng = coords[idx]
        info = fetch_flow_at_point(lat, lng)
        if info:
            info["path_index"] = idx
            results.append(info)
    return results
