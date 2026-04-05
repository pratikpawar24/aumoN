"""
Build road network graph from OpenStreetMap data using Overpass API.
Nodes = intersections, Edges = road segments with attributes.
"""
import requests
import json
import math
from typing import Dict, List, Tuple, Optional
from algorithms.dijkstra import haversine_distance

ROAD_SPEED_LIMITS = {
    'motorway':       110.0,
    'trunk':          80.0,
    'primary':        60.0,
    'secondary':      50.0,
    'tertiary':       40.0,
    'unclassified':   30.0,
    'residential':    30.0,
    'service':        20.0,
    'living_street':  15.0,
    'pedestrian':     5.0,
    'cycleway':       20.0,
    'footway':        5.0,
    'path':           5.0,
}

ROAD_ALLOWED_VEHICLES = {
    'motorway':     ['car', 'motorcycle', 'electric'],
    'trunk':        ['car', 'motorcycle', 'electric', 'bus'],
    'primary':      ['car', 'motorcycle', 'electric', 'bus'],
    'secondary':    ['car', 'motorcycle', 'electric', 'bus'],
    'tertiary':     ['car', 'motorcycle', 'electric', 'bus'],
    'residential':  ['car', 'motorcycle', 'electric', 'bus', 'bike'],
    'service':      ['car', 'motorcycle', 'electric', 'bike'],
    'cycleway':     ['bike'],
    'footway':      ['walk'],
    'pedestrian':   ['walk', 'bike'],
    'path':         ['walk', 'bike'],
}

class GraphEngine:
    """Build and manage road network graphs from OpenStreetMap data."""

    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        self.graph: Dict[str, List[dict]] = {}
        self.node_coords: Dict[str, Tuple[float, float]] = {}
        self.edges: Dict[str, dict] = {}

    def build_graph_from_bbox(
        self,
        south: float,
        west: float,
        north: float,
        east: float,
        vehicle_type: str = 'car'
    ) -> Dict:
        """
        Fetch OSM data and build weighted graph for routing.
        
        Returns {'graph': adjacency_list, 'node_coords': node_positions}
        """
        # Determine which road types to include
        if vehicle_type in ('bike',):
            highway_filter = '["highway"~"cycleway|residential|secondary|tertiary|path|footway"]'
        elif vehicle_type == 'walk':
            highway_filter = '["highway"~"footway|pedestrian|path|residential|service"]'
        else:
            highway_filter = '["highway"~"motorway|trunk|primary|secondary|tertiary|residential|service|unclassified"]'

        query = f"""
        [out:json][timeout:30];
        (
            way{highway_filter}({south},{west},{north},{east});
            >;
        );
        out body;
        """
        try:
            response = requests.post(
                self.overpass_url,
                data=f"data={requests.utils.quote(query)}",
                timeout=35,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            response.raise_for_status()
            data = response.json()
            return self._parse_osm_data(data, vehicle_type)
        except Exception as e:
            print(f"Overpass API error: {e}. Using synthetic graph.")
            return self._build_synthetic_graph(south, west, north, east)

    def _parse_osm_data(self, data: dict, vehicle_type: str) -> dict:
        """Parse OSM JSON response into routing graph."""
        nodes = {}
        ways = []

        for element in data.get('elements', []):
            if element['type'] == 'node':
                nodes[element['id']] = (element['lat'], element['lon'])
            elif element['type'] == 'way':
                ways.append(element)

        graph: Dict[str, List[dict]] = {}
        node_coords: Dict[str, Tuple[float, float]] = {}

        # Add all nodes to coord map
        for nid, (lat, lng) in nodes.items():
            node_id = str(nid)
            node_coords[node_id] = (lat, lng)
            graph[node_id] = []

        # Build edges from ways
        for way in ways:
            tags = way.get('tags', {})
            way_nodes = way.get('nodes', [])
            road_type = tags.get('highway', 'residential')
            speed_limit = float(tags.get('maxspeed', ROAD_SPEED_LIMITS.get(road_type, 30.0)))
            road_name = tags.get('name', tags.get('ref', road_type))
            oneway = tags.get('oneway', 'no') == 'yes'
            lanes = int(tags.get('lanes', 1))

            for i in range(len(way_nodes) - 1):
                u_id = str(way_nodes[i])
                v_id = str(way_nodes[i + 1])

                if u_id not in nodes or v_id not in nodes:
                    continue

                u_lat, u_lng = nodes[way_nodes[i]]
                v_lat, v_lng = nodes[way_nodes[i + 1]]
                dist_km = haversine_distance(u_lat, u_lng, v_lat, v_lng)
                edge_id = f"{way['id']}_{i}"

                edge = {
                    'to': v_id,
                    'distance_km': dist_km,
                    'speed_limit_kmh': speed_limit,
                    'road_type': road_type,
                    'name': road_name,
                    'id': edge_id,
                    'lanes': lanes,
                    'way_id': way['id']
                }
                reverse_edge = {**edge, 'to': u_id, 'id': f"{edge_id}_r"}

                if u_id not in graph:
                    graph[u_id] = []
                graph[u_id].append(edge)

                if not oneway:
                    if v_id not in graph:
                        graph[v_id] = []
                    graph[v_id].append(reverse_edge)

        self.graph = graph
        self.node_coords = node_coords

        return {'graph': graph, 'node_coords': node_coords, 'node_count': len(node_coords)}

    def _build_synthetic_graph(
        self, south: float, west: float, north: float, east: float
    ) -> dict:
        """
        Build a synthetic grid graph when OSM data is unavailable.
        Used for testing and fallback scenarios.
        """
        graph: Dict[str, List[dict]] = {}
        node_coords: Dict[str, Tuple[float, float]] = {}

        lat_steps = 10
        lng_steps = 10
        lat_range = north - south
        lng_range = east - west

        # Create grid nodes
        for i in range(lat_steps):
            for j in range(lng_steps):
                nid = f"node_{i}_{j}"
                lat = south + (i / lat_steps) * lat_range
                lng = west + (j / lng_steps) * lng_range
                node_coords[nid] = (lat, lng)
                graph[nid] = []

        # Create edges (4-connected grid + some diagonals)
        for i in range(lat_steps):
            for j in range(lng_steps):
                nid = f"node_{i}_{j}"
                lat1, lng1 = node_coords[nid]
                neighbors = [
                    (i+1, j), (i-1, j), (i, j+1), (i, j-1)  # Cardinal
                ]
                for ni, nj in neighbors:
                    if 0 <= ni < lat_steps and 0 <= nj < lng_steps:
                        neighbor_id = f"node_{ni}_{nj}"
                        lat2, lng2 = node_coords[neighbor_id]
                        dist = haversine_distance(lat1, lng1, lat2, lng2)
                        road_type = 'primary' if (i % 3 == 0 or j % 3 == 0) else 'residential'
                        speed = ROAD_SPEED_LIMITS.get(road_type, 40.0)
                        graph[nid].append({
                            'to': neighbor_id,
                            'distance_km': dist,
                            'speed_limit_kmh': speed,
                            'road_type': road_type,
                            'name': f'{road_type} road',
                            'id': f'synthetic_{nid}_{neighbor_id}',
                        })

        self.graph = graph
        self.node_coords = node_coords
        return {'graph': graph, 'node_coords': node_coords, 'node_count': len(node_coords)}

    def find_nearest_node(self, lat: float, lng: float) -> Optional[str]:
        """Find the graph node nearest to a geographic coordinate."""
        if not self.node_coords:
            return None
        
        min_dist = float('inf')
        nearest = None
        for node_id, (n_lat, n_lng) in self.node_coords.items():
            d = haversine_distance(lat, lng, n_lat, n_lng)
            if d < min_dist:
                min_dist = d
                nearest = node_id
        return nearest

    def get_edge_weight(
        self,
        edge: dict,
        traffic_data: Optional[dict],
        emission_factors: Optional[dict],
        optimize_for: str = 'carbon'
    ) -> float:
        """Calculate edge weight based on optimization objective."""
        profiles = {
            'carbon':   (0.2, 0.7, 0.1),
            'time':     (0.7, 0.2, 0.1),
            'distance': (0.1, 0.2, 0.7),
            'balanced': (0.33, 0.34, 0.33),
        }
        alpha, beta, gamma = profiles.get(optimize_for, (0.33, 0.34, 0.33))
        from algorithms.dijkstra import compute_edge_weight
        weight, _, _, _ = compute_edge_weight(edge, 'car', traffic_data, alpha, beta, gamma)
        return weight

    def get_route_geometry(self, path: List[str]) -> List[Tuple[float, float]]:
        """Convert node path to lat/lng coordinates."""
        geometry = []
        for node_id in path:
            if node_id in self.node_coords:
                geometry.append(self.node_coords[node_id])
        return geometry