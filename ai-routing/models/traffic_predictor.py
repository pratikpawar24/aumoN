"""
ML-based traffic prediction model.
Features: hour_of_day, day_of_week, road_type, historical_avg_speed, is_holiday
Target: predicted_speed_kmh per road segment
"""
import numpy as np
from typing import Dict, List, Optional, Tuple
import json
import os

# Synthetic training data generator (in production, use real traffic data)
def generate_synthetic_traffic_data(n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
    """Generate synthetic traffic data for training."""
    np.random.seed(42)
    
    hours       = np.random.randint(0, 24, n_samples)
    days        = np.random.randint(0, 7, n_samples)
    road_types  = np.random.randint(0, 5, n_samples)  # 0=residential,1=primary,2=secondary,3=motorway,4=trunk
    hist_speeds = np.random.uniform(10, 80, n_samples)
    is_holiday  = np.random.randint(0, 2, n_samples)

    # Create realistic speed patterns
    speeds = hist_speeds.copy()
    
    # Morning rush: 7-9 AM
    morning_rush = (hours >= 7) & (hours <= 9) & (days < 5)
    speeds[morning_rush] *= np.random.uniform(0.4, 0.7, morning_rush.sum())
    
    # Evening rush: 5-7 PM
    evening_rush = (hours >= 17) & (hours <= 19) & (days < 5)
    speeds[evening_rush] *= np.random.uniform(0.4, 0.65, evening_rush.sum())
    
    # Night time: lower traffic
    night = (hours >= 22) | (hours <= 5)
    speeds[night] = np.minimum(speeds[night] * 1.3, 80.0)
    
    # Weekends: less congestion
    weekend = days >= 5
    speeds[weekend] *= np.random.uniform(0.9, 1.2, weekend.sum())
    
    # Motorways faster
    motorway = road_types == 3
    speeds[motorway] = np.minimum(speeds[motorway] * 1.5, 110.0)
    
    # Residential slower
    residential = road_types == 0
    speeds[residential] = np.minimum(speeds[residential] * 0.6, 30.0)
    
    speeds = np.clip(speeds, 5.0, 120.0)
    
    X = np.column_stack([hours, days, road_types, hist_speeds, is_holiday])
    y = speeds
    return X, y

ROAD_TYPE_MAP = {
    'residential': 0,
    'primary': 1,
    'secondary': 2,
    'motorway': 3,
    'trunk': 4,
    'tertiary': 2,
    'unclassified': 0,
    'service': 0,
}

class TrafficPredictor:
    """
    Gradient Boosting-based traffic speed predictor.
    Uses synthetic data for demo; replace with real traffic API data in production.
    """

    def __init__(self):
        self.model = None
        self.is_trained = False
        self._train_on_init()

    def _train_on_init(self):
        """Train model on synthetic data at startup."""
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            X, y = generate_synthetic_traffic_data(5000)
            split = int(0.8 * len(X))
            X_train, y_train = X[:split], y[:split]

            self.model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                random_state=42
            )
            self.model.fit(X_train, y_train)
            self.is_trained = True
        except Exception as e:
            print(f"Warning: Could not train traffic model: {e}")
            self.is_trained = False

    def predict_speed(
        self,
        road_type: str,
        hour: int,
        day_of_week: int,
        historical_avg_speed: float = 40.0,
        is_holiday: bool = False
    ) -> float:
        """Predict traffic speed for a road segment at given time."""
        if not self.is_trained:
            return self._rule_based_prediction(road_type, hour, day_of_week)

        road_type_encoded = ROAD_TYPE_MAP.get(road_type.lower(), 0)
        holiday_int = 1 if is_holiday else 0
        X = np.array([[hour, day_of_week, road_type_encoded, historical_avg_speed, holiday_int]])
        predicted = float(self.model.predict(X)[0])
        return round(max(5.0, min(120.0, predicted)), 1)

    def _rule_based_prediction(
        self, road_type: str, hour: int, day_of_week: int
    ) -> float:
        """Fallback rule-based prediction when ML model is unavailable."""
        base_speeds = {
            'motorway': 90.0, 'trunk': 70.0, 'primary': 50.0,
            'secondary': 40.0, 'tertiary': 35.0, 'residential': 25.0,
        }
        base = base_speeds.get(road_type.lower(), 40.0)
        
        is_weekday = day_of_week < 5
        if is_weekday and 7 <= hour <= 9:
            base *= 0.55   # Morning rush
        elif is_weekday and 17 <= hour <= 19:
            base *= 0.50   # Evening rush
        elif hour >= 22 or hour <= 5:
            base *= 1.25   # Night time
        return round(max(5.0, base), 1)

    def get_congestion_level(
        self, predicted_speed: float, free_flow_speed: float
    ) -> str:
        """
        Determine congestion level from speed.
        Returns: free_flow, moderate, heavy, gridlock
        """
        if free_flow_speed <= 0:
            free_flow_speed = 60.0
        ratio = predicted_speed / free_flow_speed
        if ratio >= 0.8:
            return 'free_flow'
        elif ratio >= 0.5:
            return 'moderate'
        elif ratio >= 0.25:
            return 'heavy'
        else:
            return 'gridlock'

    def predict_traffic_conditions(
        self,
        road_segments: List[dict],
        hour: int,
        day_of_week: int,
        is_holiday: bool = False
    ) -> List[dict]:
        """
        Predict traffic conditions for multiple road segments.
        
        road_segments: [{'id', 'road_type', 'free_flow_speed', 'length_km'}]
        """
        results = []
        for seg in road_segments:
            hist_speed = seg.get('free_flow_speed', 40.0)
            predicted_speed = self.predict_speed(
                seg.get('road_type', 'primary'),
                hour,
                day_of_week,
                hist_speed,
                is_holiday
            )
            congestion = self.get_congestion_level(predicted_speed, hist_speed)
            results.append({
                'segment_id': seg.get('id', 'unknown'),
                'predicted_speed_kmh': predicted_speed,
                'free_flow_speed_kmh': hist_speed,
                'congestion_level': congestion,
                'road_type': seg.get('road_type', 'primary'),
                'length_km': seg.get('length_km', 0.5),
            })
        return results

    def get_congestion_map(
        self, lat: float, lng: float, radius_km: float = 5.0, hour: int = 8
    ) -> List[dict]:
        """
        Generate a synthetic congestion map around a location.
        In production, use real traffic APIs (TomTom, HERE, Google).
        """
        import random
        random.seed(int(lat * 1000 + lng * 1000 + hour))
        
        # Generate synthetic road segments
        segments = []
        for i in range(20):
            dlat = random.uniform(-radius_km/111, radius_km/111)
            dlng = random.uniform(-radius_km/111, radius_km/111)
            road_types = ['residential', 'primary', 'secondary', 'trunk']
            rt = random.choice(road_types)
            free_flow = {'residential': 30, 'primary': 50, 'secondary': 40, 'trunk': 70}[rt]
            
            predicted = self.predict_speed(rt, hour, 1, float(free_flow))
            congestion = self.get_congestion_level(predicted, free_flow)
            
            segments.append({
                'id': f'seg_{i}',
                'lat': lat + dlat,
                'lng': lng + dlng,
                'road_type': rt,
                'predicted_speed_kmh': predicted,
                'free_flow_speed_kmh': free_flow,
                'congestion_level': congestion,
            })
        return segments