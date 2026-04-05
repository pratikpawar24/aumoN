"""
Carbon-aware multi-objective routing.
Implements the AUMO paper's routing methodology:
  - Multi-objective: minimize (α × time + β × CO2 + γ × distance)
  - Generate 3-5 alternative routes with different trade-offs
  - Traffic-aware edge weighting
  - Support for multiple transport modes
"""
from typing import List, Dict, Tuple, Optional
from algorithms.dijkstra import dijkstra_carbon_aware, haversine_distance
from algorithms.astar import astar_carbon_aware
from models.emission_model import EmissionModel

emission_model = EmissionModel()

OPTIMIZATION_PROFILES = {
    'carbon': {
        'alpha': 0.2,  # time weight
        'beta':  0.7,  # emission weight
        'gamma': 0.1,  # distance weight
        'label': 'Eco Route',
        'color': '#22c55e'
    },
    'time': {
        'alpha': 0.7,
        'beta':  0.2,
        'gamma': 0.1,
        'label': 'Fastest Route',
        'color': '#ef4444'
    },
    'distance': {
        'alpha': 0.1,
        'beta':  0.2,
        'gamma': 0.7,
        'label': 'Shortest Route',
        'color': '#3b82f6'
    },
    'balanced': {
        'alpha': 0.33,
        'beta':  0.34,
        'gamma': 0.33,
        'label': 'Balanced Route',
        'color': '#f59e0b'
    },
}

class CarbonRouter:
    def __init__(self):
        self.emission_model = EmissionModel()

    def optimize_route(
        self,
        graph: Dict,
        node_coords: Dict,
        source: str,
        target: str,
        vehicle_type: str = 'car',
        optimize_for: str = 'carbon',
        traffic_data: Optional[dict] = None,
        max_detour_percent: float = 15.0,
        use_astar: bool = True
    ) -> dict:
        """
        Compute optimized route with alternatives.

        Returns primary route + 3-5 alternatives ranked by carbon efficiency.
        """
        profile = OPTIMIZATION_PROFILES.get(optimize_for, OPTIMIZATION_PROFILES['balanced'])

        # Primary route with requested optimization
        if use_astar and node_coords:
            primary = astar_carbon_aware(
                graph, node_coords, source, target, vehicle_type,
                traffic_data, profile['alpha'], profile['beta'], profile['gamma']
            )
        else:
            primary = dijkstra_carbon_aware(
                graph, source, target, vehicle_type,
                traffic_data, profile['alpha'], profile['beta'], profile['gamma']
            )

        if not primary:
            return {'error': 'No route found between source and destination'}

        # Generate alternatives with different profiles
        alternatives = []
        for prof_name, prof_vals in OPTIMIZATION_PROFILES.items():
            if prof_name == optimize_for:
                continue
            if use_astar and node_coords:
                alt = astar_carbon_aware(
                    graph, node_coords, source, target, vehicle_type,
                    traffic_data, prof_vals['alpha'], prof_vals['beta'], prof_vals['gamma']
                )
            else:
                alt = dijkstra_carbon_aware(
                    graph, source, target, vehicle_type,
                    traffic_data, prof_vals['alpha'], prof_vals['beta'], prof_vals['gamma']
                )
            if alt:
                alt['label'] = prof_vals['label']
                alt['color'] = prof_vals['color']
                alt['profile'] = prof_name
                alternatives.append(alt)

        # Sort alternatives by carbon emissions
        alternatives.sort(key=lambda x: x['total_emissions_g'])

        # Enrich primary route
        primary['label'] = profile['label']
        primary['color'] = profile['color']
        primary['profile'] = optimize_for
        primary['vehicle_type'] = vehicle_type

        # Calculate baseline (car, no optimization)
        baseline_emission = primary['total_distance_km'] * 150.0
        primary['baseline_emission_g'] = round(baseline_emission, 2)

        # Mode-specific comparison
        modal_comparison = self._get_modal_comparison(
            primary['total_distance_km'],
            primary['total_time_minutes']
        )

        return {
            'primary_route': primary,
            'alternatives': alternatives[:3],
            'modal_comparison': modal_comparison,
            'optimization_profile': optimize_for,
        }

    def _get_modal_comparison(self, distance_km: float, time_min: float) -> List[dict]:
        """Compare emissions across transport modes for the same journey."""
        modes = [
            {'mode': 'walk',       'ef': 0.0,   'speed': 5.0,   'icon': '🚶', 'label': 'Walk'},
            {'mode': 'bike',       'ef': 0.0,   'speed': 15.0,  'icon': '🚲', 'label': 'Cycling'},
            {'mode': 'electric',   'ef': 55.0,  'speed': 45.0,  'icon': '⚡', 'label': 'Electric Car'},
            {'mode': 'bus',        'ef': 90.0,  'speed': 25.0,  'icon': '🚌', 'label': 'Bus'},
            {'mode': 'motorcycle', 'ef': 100.0, 'speed': 50.0,  'icon': '🏍️', 'label': 'Motorcycle'},
            {'mode': 'car',        'ef': 150.0, 'speed': 40.0,  'icon': '🚗', 'label': 'Car (Petrol)'},
        ]
        results = []
        for m in modes:
            emission = distance_km * m['ef']
            est_time = (distance_km / m['speed']) * 60.0 if m['speed'] > 0 else float('inf')
            results.append({
                'mode': m['mode'],
                'icon': m['icon'],
                'label': m['label'],
                'emission_g': round(emission, 1),
                'estimated_time_min': round(est_time, 1),
                'distance_km': round(distance_km, 2),
            })
        return results

    def generate_route_instructions(
        self,
        path: List[str],
        node_coords: Dict,
        graph: Dict
    ) -> List[dict]:
        """Generate human-readable turn-by-turn instructions."""
        instructions = []
        if len(path) < 2:
            return instructions

        instructions.append({
            'step': 1,
            'instruction': 'Start at origin',
            'distance_m': 0,
            'duration_s': 0,
            'type': 'depart'
        })

        total_dist = 0.0
        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            # Find edge
            edge = next((e for e in graph.get(u, []) if e['to'] == v), None)
            if not edge:
                continue

            dist_m = edge.get('distance_km', 0) * 1000
            speed  = edge.get('speed_limit_kmh', 40)
            dur_s  = (dist_m / 1000 / speed) * 3600
            total_dist += dist_m
            road_name = edge.get('name', edge.get('road_type', 'unnamed road'))

            instructions.append({
                'step': i + 2,
                'instruction': f'Continue on {road_name}',
                'distance_m': round(dist_m, 1),
                'duration_s': round(dur_s, 1),
                'type': 'continue',
                'road_name': road_name
            })

        instructions.append({
            'step': len(instructions) + 1,
            'instruction': 'Arrive at destination',
            'distance_m': 0,
            'duration_s': 0,
            'type': 'arrive'
        })

        return instructions