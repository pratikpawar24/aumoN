"""OpenStreetMap data parser and utilities."""
import requests
from typing import List, Dict, Optional, Tuple

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def fetch_pois(
    lat: float,
    lng: float,
    radius_m: int = 1000,
    categories: Optional[List[str]] = None
) -> List[dict]:
    """
    Fetch Points of Interest from Overpass API.
    Categories: amenity, shop, public_transport, building, tourism, etc.
    """
    if categories is None:
        categories = ['amenity', 'shop', 'public_transport', 'tourism', 'office', 'leisure']

    filters = []
    for cat in categories:
        filters.append(f'node["{cat}"](around:{radius_m},{lat},{lng});')
        filters.append(f'way["{cat}"]["name"](around:{radius_m},{lat},{lng});')

    filters_str = '\n'.join(filters)
    query = f"""
    [out:json][timeout:25];
    (
        {filters_str}
        node["highway"="bus_stop"](around:{radius_m},{lat},{lng});
        node["public_transport"="stop_position"](around:{radius_m},{lat},{lng});
        way["building"]["name"](around:{radius_m},{lat},{lng});
    );
    out body center;
    """
    try:
        response = requests.post(
            OVERPASS_URL,
            data=f"data={requests.utils.quote(query)}",
            timeout=30,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        response.raise_for_status()
        return parse_poi_response(response.json())
    except Exception as e:
        print(f"Overpass POI fetch error: {e}")
        return []

def parse_poi_response(data: dict) -> List[dict]:
    """Parse Overpass API response into POI objects."""
    pois = []
    for el in data.get('elements', []):
        tags = el.get('tags', {})
        name = tags.get('name', tags.get('name:en', ''))
        if not name:
            continue  # Skip unnamed POIs

        # Get coordinates (handle both node and way)
        lat = el.get('lat', el.get('center', {}).get('lat'))
        lng = el.get('lon', el.get('center', {}).get('lon'))
        if lat is None or lng is None:
            continue

        category = _categorize_poi(tags)
        pois.append({
            'id': el['id'],
            'type': el['type'],
            'name': name,
            'category': category,
            'lat': lat,
            'lng': lng,
            'tags': tags,
            'address': _extract_address(tags),
            'icon': _get_poi_icon(category),
        })
    return pois

def _categorize_poi(tags: dict) -> str:
    """Determine POI category from OSM tags."""
    if tags.get('highway') == 'bus_stop' or tags.get('public_transport'):
        return 'bus_stop'
    if tags.get('shop'):
        return f"shop_{tags['shop']}"
    if tags.get('amenity') in ('restaurant', 'cafe', 'fast_food', 'bar', 'pub'):
        return 'food_drink'
    if tags.get('amenity') in ('hospital', 'pharmacy', 'clinic', 'doctors'):
        return 'health'
    if tags.get('amenity') in ('school', 'university', 'college', 'kindergarten'):
        return 'education'
    if tags.get('amenity') in ('bank', 'atm'):
        return 'finance'
    if tags.get('tourism'):
        return 'tourism'
    if tags.get('office'):
        return 'office'
    if tags.get('leisure'):
        return 'leisure'
    if tags.get('building'):
        return 'building'
    if tags.get('amenity'):
        return f"amenity_{tags['amenity']}"
    return 'other'

def _extract_address(tags: dict) -> str:
    """Extract formatted address from OSM tags."""
    parts = []
    for key in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']:
        val = tags.get(key)
        if val:
            parts.append(val)
    return ', '.join(parts) if parts else tags.get('addr:full', '')

def _get_poi_icon(category: str) -> str:
    """Get emoji icon for POI category."""
    icon_map = {
        'bus_stop': '🚌', 'food_drink': '🍽️', 'health': '🏥',
        'education': '🎓', 'finance': '🏦', 'tourism': '🏛️',
        'office': '🏢', 'leisure': '🌳', 'building': '🏗️',
        'other': '📍',
    }
    for key, icon in icon_map.items():
        if key in category:
            return icon
    return '📍'

def nominatim_search(query: str, limit: int = 10) -> List[dict]:
    """Search locations using Nominatim geocoding."""
    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': query, 'format': 'json',
                'addressdetails': 1, 'limit': limit,
                'accept-language': 'en'
            },
            headers={'User-Agent': 'AUMO-App/2.0'},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Nominatim search error: {e}")
        return []

def nominatim_reverse(lat: float, lng: float) -> Optional[dict]:
    """Reverse geocode using Nominatim."""
    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/reverse',
            params={'lat': lat, 'lon': lng, 'format': 'json', 'addressdetails': 1},
            headers={'User-Agent': 'AUMO-App/2.0'},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Nominatim reverse error: {e}")
        return None