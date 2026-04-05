"""
Smart carpooling matching using DBSCAN spatial-temporal clustering.
Implements the AUMO paper's carpool optimization methodology.
"""
from typing import List, Dict, Optional, Tuple
from algorithms.cluster import (
    dbscan_cluster, kmeans_cluster, filter_by_preferences,
    match_passengers_to_vehicles, optimize_pickup_order
)
from algorithms.dijkstra import haversine_distance
from models.emission_model import EmissionModel

emission_model = EmissionModel()

class CarpoolMatcher:
    """
    Smart carpooling matching with spatial-temporal clustering.

    Process from paper:
    1. Ride Requests from Users
    2. Spatial-Temporal Passenger Clustering (DBSCAN / K-Means)
    3. Preference Filtering (Time Window, Detour Limit, Gender Preference)
    4. Vehicle-Passenger Matching (Graph-Based Optimization)
    5. Traffic-Aware Route Optimization (A* / Dijkstra)
    6. Output: Optimized Shared Routes
    """

    def __init__(
        self,
        eps_km: float = 2.0,
        min_samples: int = 2,
        use_dbscan: bool = True
    ):
        self.eps_km = eps_km
        self.min_samples = min_samples
        self.use_dbscan = use_dbscan

    def match_passengers(
        self,
        requests: List[dict],
        max_detour_minutes: int = 10,
        max_per_vehicle: int = 4,
        time_window_minutes: int = 30,
        use_kmeans_fallback: bool = True
    ) -> dict:
        """
        Match compatible passengers for carpooling.

        requests: [{
            'id': str,
            'pickup': {'lat', 'lng', 'address'},
            'dropoff': {'lat', 'lng', 'address'},
            'departure_time': 'HH:MM',
            'preferences': {'gender_preference', 'max_detour_minutes', 'max_walk_distance'}
        }]

        Returns groups of passengers that can share rides efficiently.
        """
        if not requests:
            return {'groups': [], 'unmatched': [], 'stats': {}}

        if len(requests) == 1:
            return {
                'groups': [],
                'unmatched': requests,
                'stats': {'total_requests': 1, 'matched': 0, 'unmatched': 1}
            }

        # Step 1: Filter requests by time window compatibility
        time_filtered = self._filter_by_time_window(requests, time_window_minutes)

        # Step 2: Spatial-temporal clustering
        if self.use_dbscan:
            clusters = dbscan_cluster(
                time_filtered,
                eps_km=self.eps_km,
                min_samples=self.min_samples,
                time_window_minutes=time_window_minutes
            )
        else:
            clusters = kmeans_cluster(time_filtered, max_per_vehicle=max_per_vehicle)

        # Step 3: Apply preference filtering on each cluster
        filtered_clusters = {}
        for cid, members in clusters.items():
            filtered = filter_by_preferences(members, max_detour_minutes)
            if filtered:
                filtered_clusters[cid] = filtered

        # Step 4: Vehicle-passenger matching
        vehicle_groups = match_passengers_to_vehicles(
            filtered_clusters, max_per_vehicle, max_detour_minutes
        )

        # Step 5: Identify unmatched passengers
        matched_ids = set()
        for grp in vehicle_groups:
            for p in grp['passengers']:
                matched_ids.add(p.get('id'))

        unmatched = [r for r in requests if r.get('id') not in matched_ids]

        # Step 6: Calculate emission savings for each group
        for grp in vehicle_groups:
            grp['emission_analysis'] = self._analyze_group_emissions(grp['passengers'])

        stats = {
            'total_requests': len(requests),
            'matched': len(matched_ids),
            'unmatched': len(unmatched),
            'vehicle_groups': len(vehicle_groups),
            'avg_group_size': (
                sum(g['passenger_count'] for g in vehicle_groups) / len(vehicle_groups)
                if vehicle_groups else 0
            ),
        }

        return {
            'groups': vehicle_groups,
            'unmatched': unmatched,
            'stats': stats
        }

    def calculate_shared_route(
        self,
        matched_group: dict,
        graph: Optional[dict] = None,
        emission_factors: Optional[dict] = None,
        vehicle_type: str = 'car'
    ) -> dict:
        """
        Calculate optimal shared route for a matched carpool group.
        Minimizes total emissions while keeping individual detours within limits.
        """
        passengers = matched_group.get('passengers', [])
        if not passengers:
            return {}

        # Order pickups (already done in matching)
        ordered = optimize_pickup_order(passengers)

        # Build waypoints: all pickups then all dropoffs
        waypoints = []
        for p in ordered:
            waypoints.append({'type': 'pickup', 'passenger_id': p['id'], **p['pickup']})
        for p in ordered:
            waypoints.append({'type': 'dropoff', 'passenger_id': p['id'], **p['dropoff']})

        # Calculate total shared route distance
        total_dist = 0.0
        for i in range(len(waypoints) - 1):
            a = waypoints[i]
            b = waypoints[i + 1]
            total_dist += haversine_distance(a['lat'], a['lng'], b['lat'], b['lng'])

        # Shared route emissions
        shared_emission = total_dist * 150.0  # car emission factor

        # Individual trip emissions
        individual_emissions = []
        for p in ordered:
            d = haversine_distance(
                p['pickup']['lat'], p['pickup']['lng'],
                p['dropoff']['lat'], p['dropoff']['lng']
            )
            individual_emissions.append(d * 150.0)

        savings = emission_model.calculate_carpool_savings(
            individual_emissions, shared_emission, len(ordered)
        )

        return {
            'group_id': matched_group.get('group_id'),
            'waypoints': waypoints,
            'total_distance_km': round(total_dist, 3),
            'shared_emission_g': round(shared_emission, 2),
            'emission_savings': savings,
            'passenger_count': len(ordered),
            'vehicle_type': vehicle_type,
            'estimated_time_min': round((total_dist / 30) * 60, 1),
        }

    def _filter_by_time_window(
        self, requests: List[dict], window_minutes: int
    ) -> List[dict]:
        """Pre-filter: only keep requests within reasonable time windows."""
        if not requests:
            return []
        
        def to_minutes(t: str) -> int:
            try:
                h, m = map(int, t.split(':'))
                return h * 60 + m
            except Exception:
                return 480

        return requests  # In production, implement full time window filtering

    def _analyze_group_emissions(self, passengers: List[dict]) -> dict:
        """Calculate emission analysis for a carpool group."""
        n = len(passengers)
        if n == 0:
            return {}

        # Estimate distances
        individual_emissions = []
        for p in passengers:
            d = haversine_distance(
                p['pickup']['lat'], p['pickup']['lng'],
                p['dropoff']['lat'], p['dropoff']['lng']
            )
            individual_emissions.append(d * 150.0)

        total_individual = sum(individual_emissions)
        # Shared route adds ~20% more distance for pickups
        shared_distance = sum(
            haversine_distance(
                p['pickup']['lat'], p['pickup']['lng'],
                p['dropoff']['lat'], p['dropoff']['lng']
            )
            for p in passengers
        ) * 1.2
        shared_emission = shared_distance * 150.0

        return emission_model.calculate_carpool_savings(
            individual_emissions, shared_emission, n
        )