import heapq
import math
from typing import Dict, List, Tuple, Optional
from algorithms.dijkstra import (
    haversine_distance, get_emission_factor, get_congestion_level,
    compute_edge_weight
)

def astar_carbon_aware(
    graph: Dict[str, List[dict]],
    node_coords: Dict[str, Tuple[float, float]],
    source: str,
    target: str,
    vehicle_type: str = 'car',
    traffic_data: Optional[dict] = None,
    alpha: float = 0.4,
    beta: float = 0.4,
    gamma: float = 0.2
) -> Optional[dict]:
    """
    A* algorithm with carbon-aware heuristic.

    h(n) = haversine_distance(n, target) * average_emission_factor / max_speed
    
    Faster than Dijkstra for large urban networks due to informed search.

    Args:
        graph: Adjacency list
        node_coords: {node_id: (lat, lng)}
        source/target: Node IDs
        vehicle_type: Transport mode
        traffic_data: Optional traffic speed data
        alpha/beta/gamma: Objective weights

    Returns:
        Same structure as dijkstra_carbon_aware
    """
    if source not in node_coords or target not in node_coords:
        return None

    target_lat, target_lng = node_coords[target]

    # Admissible bounds: heuristic must NEVER exceed true remaining cost.
    # Use the lowest possible EF (best road class, no congestion, no speed
    # penalty) and the highest possible speed (motorway upper) so each
    # component is a strict lower bound.
    vt = vehicle_type.lower()
    if vt in ('bike', 'walk'):
        best_ef = 0.0
    else:
        base = {'car': 150.0, 'electric': 55.0, 'bus': 90.0, 'motorcycle': 100.0}.get(vt, 150.0)
        best_ef = base * 0.92  # tertiary road, free-flow, no >60 km/h penalty
    max_speed = 130.0  # above any realistic posted limit

    def heuristic(node_id: str) -> float:
        if node_id not in node_coords:
            return 0.0
        lat, lng = node_coords[node_id]
        dist = haversine_distance(lat, lng, target_lat, target_lng)
        time_min = (dist / max_speed) * 60.0
        emission = dist * best_ef
        # Same raw-units composition as compute_edge_weight (admissible LB).
        return alpha * time_min + beta * (emission / 100.0) + gamma * dist

    # f = g + h, g = actual cost so far
    open_set = [(heuristic(source), 0.0, source)]

    g_weight  = {source: 0.0}
    g_dist    = {source: 0.0}
    g_time    = {source: 0.0}
    g_emission= {source: 0.0}
    came_from = {source: None}
    came_edge = {source: None}
    closed    = set()

    while open_set:
        f, g, u = heapq.heappop(open_set)

        if u in closed:
            continue
        closed.add(u)

        if u == target:
            break

        for edge in graph.get(u, []):
            v = edge['to']
            if v in closed:
                continue

            w, d, t, e = compute_edge_weight(
                edge, vehicle_type, traffic_data, alpha, beta, gamma
            )
            tentative_g = g + w

            if tentative_g < g_weight.get(v, float('inf')):
                g_weight[v]   = tentative_g
                g_dist[v]     = g_dist[u] + d
                g_time[v]     = g_time[u] + t
                g_emission[v] = g_emission[u] + e
                came_from[v]  = u
                came_edge[v]  = edge
                f_v = tentative_g + heuristic(v)
                heapq.heappush(open_set, (f_v, tentative_g, v))

    if target not in came_from and target != source:
        return None

    # Reconstruct path
    path = []
    segments = []
    curr = target
    while curr is not None:
        path.append(curr)
        if came_edge.get(curr):
            segments.append(came_edge[curr])
        curr = came_from.get(curr)
    path.reverse()
    segments.reverse()

    total_dist     = g_dist.get(target, 0.0)
    total_time     = g_time.get(target, 0.0)
    total_emission = g_emission.get(target, 0.0)

    baseline_emission = total_dist * 150.0
    carbon_saved = max(0.0, baseline_emission - total_emission)

    if baseline_emission > 0:
        savings_pct = (carbon_saved / baseline_emission) * 100.0
        green_score = max(0.0, min(100.0, savings_pct))
    else:
        savings_pct = 100.0 if vehicle_type in ('bike', 'walk') else 0.0
        green_score = savings_pct

    return {
        'path': path,
        'total_distance_km': round(total_dist, 3),
        'total_time_minutes': round(total_time, 2),
        'total_emissions_g': round(total_emission, 2),
        'baseline_emission_g': round(baseline_emission, 2),
        'carbon_saved_g': round(carbon_saved, 2),
        'co2_savings_percent': round(savings_pct, 1),
        'green_score': round(green_score, 1),
        'segment_details': segments,
        'algorithm': 'astar_carbon_aware'
    }