"""
OSRM public-demo client.

Used as a middle fallback when our internal Dijkstra/A* on the
Overpass-derived OSM graph fails (Overpass timeouts, sparse data, no path
found). OSRM returns a real road-following polyline so the user never
sees a straight haversine line.

The public demo at router.project-osrm.org is rate-limited but free and
requires no key. Best-effort: if OSRM also fails, the caller will fall
through to the haversine straight-line.
"""
import os
import logging
import requests

log = logging.getLogger(__name__)

# Allow override for self-hosted OSRM if someone wants to swap it.
OSRM_BASE = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")


def route(origin_lat: float, origin_lng: float,
          dest_lat: float, dest_lng: float,
          profile: str = "driving",
          timeout: float = 8.0):
    """
    Returns dict with:
      coords          [(lat, lng), ...]   road-following polyline
      distance_km     float
      duration_min    float
    or None on failure.
    """
    url = (
        f"{OSRM_BASE}/route/v1/{profile}/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    )
    try:
        r = requests.get(
            url,
            params={
                "overview": "full",
                "geometries": "geojson",
                "alternatives": "false",
                "steps": "false",
            },
            timeout=timeout,
        )
        if r.status_code != 200:
            log.warning("OSRM HTTP %s: %s", r.status_code, r.text[:200])
            return None
        data = r.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            return None
        rt = data["routes"][0]
        # GeoJSON coords are [lng, lat]; flip to (lat, lng) to match the
        # rest of the AUMO pipeline.
        coords = [(c[1], c[0]) for c in rt["geometry"]["coordinates"]]
        return {
            "coords": coords,
            "distance_km": rt.get("distance", 0) / 1000.0,
            "duration_min": rt.get("duration", 0) / 60.0,
        }
    except requests.RequestException as e:
        log.warning("OSRM request failed: %s", e)
        return None
