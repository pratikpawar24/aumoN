import { EMISSION_FACTORS } from './constants';

/**
 * CO₂ Emission Calculation — carpool savings.
 *
 * India-average tailpipe factors (g CO₂ / km). Kept as the single source of
 * truth for the "saved by sharing" number shown in the carpool UI. Mirrors
 * backend/src/utils/emissionFactors.js so client and server agree.
 */
export const CARPOOL_EMISSION_FACTORS = {
  car_petrol: 192,   // average Indian car (petrol)
  car_diesel: 171,   // average Indian car (diesel)
  car_cng:    166,   // CNG vehicle
  car:        192,   // app enum → petrol average
  bike:       104,   // two-wheeler
  motorcycle: 104,
  ev:         0,     // electric vehicle (0 tailpipe)
  electric:   0,
  default:    180,   // unknown vehicle
};

/**
 * CO₂ saved by carpooling instead of each passenger driving alone.
 *
 *   individual = distance × EF × numPassengers   (everyone drives solo)
 *   carpool    = distance × EF                    (one shared vehicle)
 *   saved      = individual − carpool = distance × EF × (numPassengers − 1)
 *
 * @returns {{ co2SavedKg, percentageReduction, individualEmissions, carpoolEmissions }}
 *          emissions are in kg CO₂; strings fixed to 2/1 decimals for display.
 */
export const calculateCO2Saved = (distance, vehicleType, numPassengers = 1) => {
  const emissionPerKm =
    CARPOOL_EMISSION_FACTORS[vehicleType] ?? CARPOOL_EMISSION_FACTORS.default;
  const n = Math.max(1, numPassengers);

  const individualEmissions = distance * emissionPerKm * n; // grams
  const carpoolEmissions = distance * emissionPerKm;         // grams
  const co2SavedGrams = Math.max(0, individualEmissions - carpoolEmissions);

  const percentageReduction =
    individualEmissions > 0 ? (co2SavedGrams / individualEmissions) * 100 : 0;

  return {
    co2SavedKg: (co2SavedGrams / 1000).toFixed(2),
    percentageReduction: percentageReduction.toFixed(1),
    individualEmissions: (individualEmissions / 1000).toFixed(2),
    carpoolEmissions: (carpoolEmissions / 1000).toFixed(2),
  };
};

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