import { EMISSION_FACTORS } from './constants';

const CONGESTION_MULTIPLIERS = {
  free_flow: 1.0,
  moderate:  1.3,
  heavy:     1.6,
  gridlock:  2.2,
};

export const calculateSegmentEmission = (distanceKm, vehicleType, congestionLevel = 'moderate') => {
  const ef = EMISSION_FACTORS[vehicleType] || 150;
  const mult = CONGESTION_MULTIPLIERS[congestionLevel] || 1.0;
  return distanceKm * ef * mult;
};

export const calculateRouteEmission = (distanceKm, vehicleType, avgCongestion = 'moderate') => {
  return calculateSegmentEmission(distanceKm, vehicleType, avgCongestion);
};

export const calculateGreenScore = (actualG, baselineG) => {
  if (baselineG <= 0) return 100;
  const ratio = actualG / baselineG;
  return Math.round(Math.min(100, Math.max(0, (2 - ratio) * 50)));
};

export const calculateCarpoolSavings = (individualEmissions, sharedEmission, numPassengers) => {
  const totalIndividual = individualEmissions.reduce((s, e) => s + e, 0);
  const saved = Math.max(0, totalIndividual - sharedEmission);
  const pct = totalIndividual > 0 ? (saved / totalIndividual) * 100 : 0;
  return {
    totalIndividualG: Math.round(totalIndividual),
    sharedEmissionG:  Math.round(sharedEmission),
    savedG:           Math.round(saved),
    savingsPercent:   Math.round(pct),
    perPassengerG:    Math.round(sharedEmission / numPassengers),
    equivalentTrees:  Math.round(saved / 21000 * 100) / 100,
  };
};

export const getModalComparison = (distanceKm) => {
  return [
    { mode: 'walk',       label: 'Walk',         icon: '🚶', ef: 0,   speed: 5,   color: '#22c55e' },
    { mode: 'bike',       label: 'Cycling',       icon: '🚲', ef: 0,   speed: 15,  color: '#4ade80' },
    { mode: 'electric',   label: 'Electric Car',  icon: '⚡', ef: 55,  speed: 45,  color: '#06b6d4' },
    { mode: 'bus',        label: 'Bus',           icon: '🚌', ef: 90,  speed: 25,  color: '#f59e0b' },
    { mode: 'motorcycle', label: 'Motorcycle',    icon: '🏍️', ef: 100, speed: 50,  color: '#f97316' },
    { mode: 'car',        label: 'Car (Petrol)',  icon: '🚗', ef: 150, speed: 40,  color: '#ef4444' },
  ].map((m) => ({
    ...m,
    emissionG:   Math.round(distanceKm * m.ef),
    timeMin:     Math.round((distanceKm / m.speed) * 60),
    distanceKm:  Math.round(distanceKm * 100) / 100,
  }));
};

export const estimateAnnualSavings = (dailySavedG, carpooledDaysPerWeek = 3) => {
  const annualDays = carpooledDaysPerWeek * 52;
  const totalSavedG = dailySavedG * annualDays;
  return {
    annualSavedKg:       Math.round(totalSavedG / 1000),
    equivalentTrees:     Math.round(totalSavedG / 21000),
    equivalentFlights:   Math.round(totalSavedG / 255000 * 10) / 10,
    annualDriving:       annualDays,
  };
};