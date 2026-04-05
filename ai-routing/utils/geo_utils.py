"""Geographic utility functions."""
import math
from typing import Tuple, List

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing between two points in degrees."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1)*math.sin(phi2) - math.sin(phi1)*math.cos(phi2)*math.cos(dlambda)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

def bounding_box(lat: float, lng: float, radius_km: float) -> Tuple[float, float, float, float]:
    """Calculate bounding box around a point."""
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    return lat - lat_delta, lng - lng_delta, lat + lat_delta, lng + lng_delta

def interpolate_polyline(
    points: List[Tuple[float, float]], num_points: int = 100
) -> List[Tuple[float, float]]:
    """Interpolate additional points along a polyline."""
    if len(points) < 2:
        return points
    result = []
    total_dist = sum(
        haversine(points[i][0], points[i][1], points[i+1][0], points[i+1][1])
        for i in range(len(points) - 1)
    )
    if total_dist == 0:
        return points
    segment_len = total_dist / num_points
    result.append(points[0])
    accumulated = 0.0
    seg_idx = 0
    while seg_idx < len(points) - 1 and len(result) < num_points:
        a, b = points[seg_idx], points[seg_idx + 1]
        seg_dist = haversine(a[0], a[1], b[0], b[1])
        while accumulated + seg_dist >= segment_len and len(result) < num_points:
            t = (segment_len - accumulated) / seg_dist if seg_dist > 0 else 0
            lat = a[0] + t * (b[0] - a[0])
            lng = a[1] + t * (b[1] - a[1])
            result.append((lat, lng))
            accumulated = 0.0
        accumulated += seg_dist
        seg_idx += 1
    result.append(points[-1])
    return result

def encode_polyline(coordinates: List[Tuple[float, float]]) -> str:
    """Encode a list of coordinates as a Google-style encoded polyline."""
    result = []
    prev_lat = prev_lng = 0
    for lat, lng in coordinates:
        lat_e5 = round(lat * 1e5)
        lng_e5 = round(lng * 1e5)
        dlat = lat_e5 - prev_lat
        dlng = lng_e5 - prev_lng
        prev_lat, prev_lng = lat_e5, lng_e5
        for val in (dlat, dlng):
            val = val << 1
            if val < 0:
                val = ~val
            while val >= 0x20:
                result.append(chr((0x20 | (val & 0x1f)) + 63))
                val >>= 5
            result.append(chr(val + 63))
    return ''.join(result)