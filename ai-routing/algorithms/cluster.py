"""
Spatial-temporal passenger clustering for smart carpooling.
Implements DBSCAN and K-Means as described in the AUMO paper.

Process:
1. Ride Requests from Users
2. Spatial-Temporal Passenger Clustering (DBSCAN / K-Means)
3. Preference Filtering (Time Window, Detour Limit, Gender Preference)
4. Vehicle-Passenger Matching (Graph-Based Optimization)
5. Traffic-Aware Route Optimization (A* / Dijkstra)
6. Output: Optimized Shared Routes
"""
import numpy as np
from typing import List, Dict, Tuple, Optional
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler

def encode_requests_for_clustering(requests: List[dict]) -> np.ndarray:
    """
    Encode passenger requests as feature vectors for clustering.
    Features: [pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, departure_time_minutes]
    """
    features = []
    for req in requests:
        pickup = req.get('pickup', {})
        dropoff = req.get('dropoff', {})
        # Convert departure time to minutes from midnight
        dep_str = req.get('departure_time', '08:00')
        try:
            h, m = map(int, dep_str.split(':'))
            dep_minutes = h * 60 + m
        except Exception:
            dep_minutes = 480  # Default 8:00 AM

        features.append([
            float(pickup.get('lat', 0)),
            float(pickup.get('lng', 0)),
            float(dropoff.get('lat', 0)),
            float(dropoff.get('lng', 0)),
            dep_minutes
        ])
    return np.array(features)

def dbscan_cluster(
    requests: List[dict],
    eps_km: float = 2.0,
    min_samples: int = 2,
    time_window_minutes: int = 30
) -> Dict[int, List[dict]]:
    """
    DBSCAN spatial-temporal clustering.

    eps_km: Maximum geographic radius for same cluster (km)
    min_samples: Minimum passengers to form a cluster
    time_window_minutes: Time tolerance for grouping passengers

    Returns: {cluster_id: [request, ...]}
    """
    if len(requests) < 2:
        return {0: requests} if requests else {}

    X = encode_requests_for_clustering(requests)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Approximate: 1 degree lat ≈ 111 km, so eps in scaled units
    # We use a spatial epsilon based on pickup proximity
    dbscan = DBSCAN(
        eps=eps_km / 111.0,  # Convert km to approx degrees
        min_samples=min_samples,
        metric='euclidean'
    )
    labels = dbscan.fit_predict(X_scaled)

    clusters: Dict[int, List[dict]] = {}
    for i, label in enumerate(labels):
        if label == -1:
            # Noise points get their own cluster
            noise_key = f'noise_{i}'
            clusters[noise_key] = [requests[i]]
        else:
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(requests[i])

    return clusters

def kmeans_cluster(
    requests: List[dict],
    n_clusters: Optional[int] = None,
    max_per_vehicle: int = 4
) -> Dict[int, List[dict]]:
    """
    K-Means clustering as fallback/alternative to DBSCAN.
    """
    if len(requests) == 0:
        return {}
    if len(requests) == 1:
        return {0: requests}

    if n_clusters is None:
        n_clusters = max(1, len(requests) // max_per_vehicle)
    n_clusters = min(n_clusters, len(requests))

    X = encode_requests_for_clustering(requests)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)

    clusters: Dict[int, List[dict]] = {}
    for i, label in enumerate(labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(requests[i])

    return clusters

def filter_by_preferences(
    cluster: List[dict],
    max_detour_minutes: int = 10,
    gender_preference: Optional[str] = None
) -> List[dict]:
    """Filter cluster members by user preferences."""
    filtered = []
    for req in cluster:
        prefs = req.get('preferences', {})

        # Gender preference filter
        if gender_preference and prefs.get('gender_preference'):
            if prefs['gender_preference'] != 'any' and prefs['gender_preference'] != gender_preference:
                continue

        # Detour tolerance filter
        req_max_detour = prefs.get('max_detour_minutes', 15)
        if max_detour_minutes > req_max_detour:
            continue

        filtered.append(req)
    return filtered

def calculate_detour_minutes(
    waypoint_lat: float,
    waypoint_lng: float,
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
    avg_speed_kmh: float = 30.0
) -> float:
    """Estimate detour time for adding a waypoint."""
    from algorithms.dijkstra import haversine_distance
    
    direct_dist = haversine_distance(from_lat, from_lng, to_lat, to_lng)
    via_dist = (
        haversine_distance(from_lat, from_lng, waypoint_lat, waypoint_lng) +
        haversine_distance(waypoint_lat, waypoint_lng, to_lat, to_lng)
    )
    detour_km = via_dist - direct_dist
    return (detour_km / avg_speed_kmh) * 60.0

def match_passengers_to_vehicles(
    clusters: Dict,
    max_per_vehicle: int = 4,
    max_detour_minutes: int = 10
) -> List[dict]:
    """
    Graph-based optimization to assign passengers to vehicles.
    Returns list of vehicle groups with optimized pickup orders.
    """
    vehicle_groups = []
    group_id = 0

    for cluster_id, passengers in clusters.items():
        if not isinstance(passengers, list) or len(passengers) == 0:
            continue

        # Split large clusters into vehicle-sized groups
        for i in range(0, len(passengers), max_per_vehicle):
            group = passengers[i:i + max_per_vehicle]
            if not group:
                continue

            # Optimize pickup order using nearest-neighbor heuristic
            ordered = optimize_pickup_order(group)

            vehicle_groups.append({
                'group_id': f'vehicle_{group_id}',
                'passengers': ordered,
                'passenger_count': len(ordered),
                'estimated_savings_percent': calculate_savings_estimate(ordered),
            })
            group_id += 1

    return vehicle_groups

def optimize_pickup_order(passengers: List[dict]) -> List[dict]:
    """
    Order pickups to minimize total detour using nearest-neighbor heuristic.
    """
    if len(passengers) <= 1:
        return passengers

    from algorithms.dijkstra import haversine_distance

    ordered = []
    remaining = passengers.copy()

    # Start from passenger with earliest departure time
    remaining.sort(key=lambda p: p.get('departure_time', '08:00'))
    current = remaining.pop(0)
    ordered.append(current)

    curr_lat = current['pickup']['lat']
    curr_lng = current['pickup']['lng']

    while remaining:
        # Find nearest next pickup
        nearest = min(
            remaining,
            key=lambda p: haversine_distance(
                curr_lat, curr_lng, p['pickup']['lat'], p['pickup']['lng']
            )
        )
        remaining.remove(nearest)
        ordered.append(nearest)
        curr_lat = nearest['pickup']['lat']
        curr_lng = nearest['pickup']['lng']

    return ordered

def calculate_savings_estimate(group: List[dict]) -> float:
    """Estimate CO2 savings from carpooling vs individual trips."""
    n = len(group)
    if n <= 1:
        return 0.0
    # Rough estimate: (n-1)/n passengers save emissions vs individual car trips
    return round(((n - 1) / n) * 100.0, 1)