"""Traffic condition simulator for testing."""
import random
import math
from typing import List, Dict
from datetime import datetime

def simulate_traffic(
    lat: float, lng: float, radius_km: float = 5.0, hour: Optional[int] = None
) -> List[dict]:
    """Simulate traffic conditions around a location."""
    from typing import Optional
    if hour is None:
        hour = datetime.now().hour

    random.seed(int(lat * 1000 + lng * 1000))
    segments = []
    
    for i in range(30):
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(0, radius_km)
        dlat = r * math.cos(angle) / 111.0
        dlng = r * math.sin(angle) / (111.0 * math.cos(math.radians(lat)))
        
        road_types = ['primary', 'secondary', 'residential', 'trunk']
        rt = random.choice(road_types)
        free_flow = {'primary': 50, 'secondary': 40, 'residential': 25, 'trunk': 70}[rt]
        
        # Apply time-based congestion
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            congestion = random.uniform(0.3, 0.7)
        elif 22 <= hour or hour <= 5:
            congestion = random.uniform(0.9, 1.0)
        else:
            congestion = random.uniform(0.6, 0.95)
        
        speed = free_flow * congestion
        segments.append({
            'id': f'sim_seg_{i}',
            'lat': lat + dlat,
            'lng': lng + dlng,
            'road_type': rt,
            'speed_kmh': round(speed, 1),
            'free_flow_speed': free_flow,
            'congestion_factor': round(congestion, 2),
        })
    return segments

from typing import Optional