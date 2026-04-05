"""
Carbon footprint estimation model.
E_total = Σ(d_i × EF_i)

Implements the emission calculation from the AUMO research paper.
"""
from typing import List, Dict, Optional

EMISSION_FACTORS = {
    'car': {
        'base_g_per_km': 150.0,
        'min': 120.0,
        'max': 250.0,
        'fuel_type': 'petrol'
    },
    'car_diesel': {
        'base_g_per_km': 140.0,
        'min': 130.0,
        'max': 220.0,
        'fuel_type': 'diesel'
    },
    'electric': {
        'base_g_per_km': 55.0,  # lifecycle emissions
        'min': 50.0,
        'max': 80.0,
        'fuel_type': 'electric'
    },
    'bus': {
        'base_g_per_km': 90.0,  # per passenger
        'min': 80.0,
        'max': 120.0,
        'fuel_type': 'diesel'
    },
    'motorcycle': {
        'base_g_per_km': 100.0,
        'min': 80.0,
        'max': 120.0,
        'fuel_type': 'petrol'
    },
    'bike': {
        'base_g_per_km': 0.0,
        'min': 0.0,
        'max': 0.0,
        'fuel_type': 'none'
    },
    'walk': {
        'base_g_per_km': 0.0,
        'min': 0.0,
        'max': 0.0,
        'fuel_type': 'none'
    },
}

CONGESTION_MULTIPLIERS = {
    'free_flow': 1.0,
    'moderate':  1.3,
    'heavy':     1.6,
    'gridlock':  2.2,
}

SPEED_EF_ADJUSTMENTS = [
    # (min_speed, max_speed, multiplier)
    (0,   10,  2.2),
    (10,  20,  1.6),
    (20,  40,  1.3),
    (40,  80,  1.0),
    (80,  120, 1.1),  # Higher speeds also increase emissions
    (120, 999, 1.3),
]

class EmissionModel:

    def get_base_emission_factor(self, vehicle_type: str) -> float:
        vt = vehicle_type.lower().replace('-', '_').replace(' ', '_')
        return EMISSION_FACTORS.get(vt, EMISSION_FACTORS['car'])['base_g_per_km']

    def get_speed_multiplier(self, avg_speed_kmh: float) -> float:
        for min_s, max_s, mult in SPEED_EF_ADJUSTMENTS:
            if min_s <= avg_speed_kmh < max_s:
                return mult
        return 1.0

    def get_congestion_level(self, avg_speed_kmh: float) -> str:
        if avg_speed_kmh > 40:
            return 'free_flow'
        elif avg_speed_kmh > 20:
            return 'moderate'
        elif avg_speed_kmh > 10:
            return 'heavy'
        else:
            return 'gridlock'

    def calculate_segment_emission(
        self,
        distance_km: float,
        vehicle_type: str,
        avg_speed_kmh: float = 40.0,
        congestion_level: Optional[str] = None
    ) -> dict:
        """
        Calculate emissions for a single road segment.
        E_i = d_i × EF_i

        Returns dict with emission_g, ef_used, congestion_level
        """
        base_ef = self.get_base_emission_factor(vehicle_type)
        if congestion_level is None:
            congestion_level = self.get_congestion_level(avg_speed_kmh)

        congestion_mult = CONGESTION_MULTIPLIERS.get(congestion_level, 1.0)
        speed_mult = self.get_speed_multiplier(avg_speed_kmh)
        
        # Use max of the two multipliers (more conservative estimate)
        ef_used = base_ef * max(congestion_mult, speed_mult)
        emission_g = distance_km * ef_used

        return {
            'emission_g': round(emission_g, 3),
            'ef_g_per_km': round(ef_used, 2),
            'distance_km': round(distance_km, 3),
            'congestion_level': congestion_level,
            'avg_speed_kmh': avg_speed_kmh,
            'vehicle_type': vehicle_type
        }

    def calculate_route_emission(
        self,
        route_segments: List[dict],
        vehicle_type: str
    ) -> dict:
        """
        Calculate total route emissions.
        E_total = Σ(d_i × EF_i)

        route_segments: [{'distance_km', 'avg_speed_kmh', 'congestion_level'}, ...]
        """
        total_emission = 0.0
        total_distance = 0.0
        segment_emissions = []

        for seg in route_segments:
            dist = seg.get('distance_km', 0.0)
            speed = seg.get('avg_speed_kmh', 40.0)
            cong = seg.get('congestion_level', None)

            result = self.calculate_segment_emission(dist, vehicle_type, speed, cong)
            total_emission += result['emission_g']
            total_distance += dist
            segment_emissions.append(result)

        return {
            'total_emission_g': round(total_emission, 2),
            'total_distance_km': round(total_distance, 3),
            'avg_ef_g_per_km': round(total_emission / total_distance, 2) if total_distance > 0 else 0.0,
            'segment_emissions': segment_emissions,
            'vehicle_type': vehicle_type
        }

    def calculate_green_score(
        self,
        actual_emission_g: float,
        baseline_emission_g: float
    ) -> float:
        """
        Green mobility score: 0-100, higher is greener.
        
        Score = 100 when zero emissions.
        Score = 50 when emissions equal baseline (average car).
        Score approaches 0 for very high emissions.
        """
        if baseline_emission_g <= 0:
            return 100.0 if actual_emission_g == 0 else 50.0

        ratio = actual_emission_g / baseline_emission_g
        # Score formula: 100 * (2 - ratio) / 2, clamped to [0, 100]
        score = 100.0 * max(0.0, (2.0 - ratio)) / 2.0
        return round(min(100.0, max(0.0, score)), 1)

    def calculate_carpool_savings(
        self,
        individual_emissions_g: List[float],
        shared_emission_g: float,
        num_passengers: int
    ) -> dict:
        """
        Calculate CO2 savings from carpooling.
        
        individual_emissions_g: What each person would emit alone
        shared_emission_g: Total emission for the shared trip
        """
        total_individual = sum(individual_emissions_g)
        saved_g = total_individual - shared_emission_g
        savings_percent = (saved_g / total_individual * 100) if total_individual > 0 else 0.0
        per_passenger_emission = shared_emission_g / num_passengers if num_passengers > 0 else 0.0

        return {
            'total_individual_emission_g': round(total_individual, 2),
            'shared_trip_emission_g': round(shared_emission_g, 2),
            'co2_saved_g': round(max(0.0, saved_g), 2),
            'savings_percent': round(max(0.0, savings_percent), 1),
            'per_passenger_emission_g': round(per_passenger_emission, 2),
            'equivalent_trees_saved': round(max(0.0, saved_g) / 21000, 4),  # 1 tree absorbs ~21kg CO2/year
        }

    def estimate_annual_savings(
        self,
        daily_emission_g: float,
        carpooled_days_per_week: int = 3,
        baseline_g: float = 150.0 * 20.0  # 20 km default commute
    ) -> dict:
        """Project annual carbon savings."""
        annual_days = carpooled_days_per_week * 52
        annual_saved = max(0.0, (baseline_g - daily_emission_g)) * annual_days
        return {
            'annual_co2_saved_kg': round(annual_saved / 1000, 2),
            'equivalent_flights_avoided': round(annual_saved / 255000, 2),  # ~255kg per short-haul flight
            'equivalent_trees_planted': round(annual_saved / 21000, 2),
        }