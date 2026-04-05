import heapq
from typing import Dict, List, Tuple, Optional
import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate haversine distance between two points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def get_emission_factor(vehicle_type: str, avg_speed_kmh: float, congestion_level: str) -> float:
    """
    Emission factor in g CO2/km.
    E_total = Σ(d_i × EF_i)
    """
    base_factors = {
        'car':       {'petrol': 150.0, 'diesel': 140.0},
        'electric':  55.0,
        'bus':       90.0,
        'bike':      0.0,
        'walk':      0.0,
        'motorcycle': 100.0,
    }

    congestion_multipliers = {
        'free_flow':  1.0,   # > 40 km/h
        'moderate':   1.3,   # 20-40 km/h
        'heavy':      1.6,   # 10-20 km/h
        'gridlock':   2.2,   # < 10 km/h
    }

    speed_bonus = 0.0
    if avg_speed_kmh > 60:
        speed_bonus = 0.1

    vt = vehicle_type.lower()
    if vt == 'car':
        base = 150.0
    elif vt == 'electric':
        base = 55.0
    elif vt == 'bus':
        base = 90.0
    elif vt in ('bike', 'walk'):
        base = 0.0
    elif vt == 'motorcycle':
        base = 100.0
    else:
        base = 150.0

    multiplier = congestion_multipliers.get(congestion_level, 1.0)
    return base * (multiplier + speed_bonus)

def get_congestion_level(speed_kmh: float) -> str:
    if speed_kmh > 40:
        return 'free_flow'
    elif speed_kmh > 20:
        return 'moderate'
    elif speed_kmh > 10:
        return 'heavy'
    else:
        return 'gridlock'

def compute_edge_weight(
    edge: dict,
    vehicle_type: str,
    traffic_data: Optional[dict],
    alpha: float,
    beta: float,
    gamma: float,
    max_time: float = 60.0,
    max_emission: float = 500.0,
    max_dist: float = 50.0
) -> Tuple[float, float, float, float]:
    """
    Compute composite edge weight.
    weight = alpha * norm_time + beta * norm_emission + gamma * norm_distance

    Returns (weight, distance_km, time_min, emission_g)
    """
    distance_km = edge.get('distance_km', 0.1)
    speed_limit = edge.get('speed_limit_kmh', 40.0)

    # Apply traffic data if available
    if traffic_data and edge.get('id') in traffic_data:
        actual_speed = traffic_data[edge['id']].get('speed_kmh', speed_limit)
    else:
        actual_speed = speed_limit

    actual_speed = max(actual_speed, 1.0)
    time_min = (distance_km / actual_speed) * 60.0

    congestion = get_congestion_level(actual_speed)
    ef = get_emission_factor(vehicle_type, actual_speed, congestion)
    emission_g = distance_km * ef

    norm_time = min(time_min / max_time, 1.0)
    norm_emission = min(emission_g / max_emission, 1.0)
    norm_dist = min(distance_km / max_dist, 1.0)

    weight = alpha * norm_time + beta * norm_emission + gamma * norm_dist
    return weight, distance_km, time_min, emission_g

def dijkstra_carbon_aware(
    graph: Dict[str, List[dict]],
    source: str,
    target: str,
    vehicle_type: str = 'car',
    traffic_data: Optional[dict] = None,
    alpha: float = 0.4,
    beta: float = 0.4,
    gamma: float = 0.2
) -> Optional[dict]:
    """
    Carbon-aware Dijkstra's algorithm.

    Edge weight = alpha * normalized_time + beta * normalized_emissions + gamma * normalized_distance
    E_total = Σ(d_i × EF_i)

    Args:
        graph: Adjacency list {node_id: [{to, distance_km, speed_limit_kmh, id, ...}]}
        source: Source node ID
        target: Target node ID
        vehicle_type: car/electric/bus/bike/walk/motorcycle
        traffic_data: {edge_id: {speed_kmh, ...}}
        alpha/beta/gamma: Weight coefficients (must sum to ~1)

    Returns:
        dict with path, total_distance_km, total_time_minutes,
              total_emissions_g, green_score, segment_details
    """
    if source not in graph:
        return None
    if target not in graph and target not in {
        nb['to'] for edges in graph.values() for nb in edges
    }:
        return None

    # Priority queue: (composite_weight, node_id)
    pq = [(0.0, source)]
    
    dist_weight = {source: 0.0}
    dist_km     = {source: 0.0}
    time_min    = {source: 0.0}
    emission_g  = {source: 0.0}
    prev        = {source: None}
    prev_edge   = {source: None}
    visited     = set()

    while pq:
        curr_weight, u = heapq.heappop(pq)
        
        if u in visited:
            continue
        visited.add(u)

        if u == target:
            break

        for edge in graph.get(u, []):
            v = edge['to']
            if v in visited:
                continue

            w, d, t, e = compute_edge_weight(
                edge, vehicle_type, traffic_data, alpha, beta, gamma
            )
            new_weight = curr_weight + w

            if new_weight < dist_weight.get(v, float('inf')):
                dist_weight[v] = new_weight
                dist_km[v]     = dist_km[u] + d
                time_min[v]    = time_min[u] + t
                emission_g[v]  = emission_g[u] + e
                prev[v]        = u
                prev_edge[v]   = edge
                heapq.heappush(pq, (new_weight, v))

    if target not in prev and target != source:
        return None

    # Reconstruct path
    path = []
    segment_details = []
    curr = target
    while curr is not None:
        path.append(curr)
        if prev_edge.get(curr):
            segment_details.append(prev_edge[curr])
        curr = prev.get(curr)
    path.reverse()
    segment_details.reverse()

    total_dist     = dist_km.get(target, 0.0)
    total_time     = time_min.get(target, 0.0)
    total_emission = emission_g.get(target, 0.0)

    # Baseline: a direct car trip at 40 km/h with no congestion optimization
    baseline_ef = 150.0
    baseline_emission = total_dist * baseline_ef
    carbon_saved = max(0.0, baseline_emission - total_emission)

    # Green score: 0-100
    if baseline_emission > 0:
        green_score = min(100.0, (carbon_saved / baseline_emission) * 100.0 + 50.0)
    else:
        green_score = 100.0 if vehicle_type in ('bike', 'walk') else 50.0

    return {
        'path': path,
        'total_distance_km': round(total_dist, 3),
        'total_time_minutes': round(total_time, 2),
        'total_emissions_g': round(total_emission, 2),
        'carbon_saved_g': round(carbon_saved, 2),
        'green_score': round(green_score, 1),
        'segment_details': segment_details,
        'algorithm': 'dijkstra_carbon_aware'
    }