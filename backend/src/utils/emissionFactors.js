/**
 * Vehicle emission factors database for AUMO.
 * E_total = Σ(d_i × EF_i)
 * Units: g CO₂ per km
 */

const EMISSION_FACTORS = {
  car: {
    petrol: { base: 150, min: 120, max: 250 },
    diesel: { base: 140, min: 130, max: 220 },
    hybrid: { base: 90,  min: 70,  max: 130 },
  },
  electric:   { base: 55,  min: 50,  max: 80  },
  bus:        { base: 90,  min: 80,  max: 120 }, // per passenger
  motorcycle: { base: 100, min: 80,  max: 120 },
  bike:       { base: 0 },
  walk:       { base: 0 },
};

const CONGESTION_MULTIPLIERS = {
  free_flow: 1.0,
  moderate:  1.3,
  heavy:     1.6,
  gridlock:  2.2,
};

/**
 * Tailpipe emission factors (g CO₂ / km) used specifically for the carpool
 * "CO₂ saved by sharing" calculation. These are India-average figures and are
 * intentionally kept separate from the route-optimisation baseline above so
 * changing one never silently distorts the other.
 *   petrol car 192 · diesel 171 · CNG 166 · two-wheeler 104 · EV 0 · default 180
 * The app's vehicle enum (car/electric/motorcycle) maps onto these.
 */
const CARPOOL_EMISSION_FACTORS = {
  car: 192,          // average Indian petrol car
  car_petrol: 192,
  car_diesel: 171,
  car_cng: 166,
  electric: 0,       // EV — zero tailpipe
  ev: 0,
  motorcycle: 104,   // two-wheeler
  bike: 104,
  default: 180,
};

const getCarpoolEF = (vehicleType) =>
  CARPOOL_EMISSION_FACTORS[(vehicleType || '').toLowerCase()] ?? CARPOOL_EMISSION_FACTORS.default;

/**
 * CO₂ saved by carpooling instead of everyone driving alone.
 *
 *   individual = distanceKm × EF × numPassengers   (each drives their own car)
 *   carpool    = distanceKm × EF                    (one shared car)
 *   saved      = individual − carpool = distanceKm × EF × (numPassengers − 1)
 *
 * @returns {{ co2SavedKg, percentageReduction, individualKg, carpoolKg }}
 */
const calculateCarpoolCO2Saved = (distanceKm, vehicleType, numPassengers = 1) => {
  const ef = getCarpoolEF(vehicleType);
  const n = Math.max(1, numPassengers);
  const individualG = distanceKm * ef * n;
  const carpoolG = distanceKm * ef;
  const savedG = Math.max(0, individualG - carpoolG);
  const pct = individualG > 0 ? (savedG / individualG) * 100 : 0;
  return {
    co2SavedG: Math.round(savedG),
    co2SavedKg: Math.round((savedG / 1000) * 100) / 100,
    percentageReduction: Math.round(pct * 10) / 10,
    individualKg: Math.round((individualG / 1000) * 100) / 100,
    carpoolKg: Math.round((carpoolG / 1000) * 100) / 100,
  };
};

const getBaseEF = (vehicleType) => {
  const vt = (vehicleType || 'car').toLowerCase();
  const entry = EMISSION_FACTORS[vt];
  if (!entry) return 150;
  if (entry.base !== undefined) return entry.base;
  if (entry.petrol) return entry.petrol.base;
  return 150;
};

const calculateEmission = (distanceKm, vehicleType, congestionLevel = 'moderate') => {
  const base = getBaseEF(vehicleType);
  const mult = CONGESTION_MULTIPLIERS[congestionLevel] || 1.0;
  return Math.round(distanceKm * base * mult);
};

const calculateGreenScore = (actualG, baselineG = null) => {
  if (!baselineG) baselineG = actualG * 1.5;
  if (baselineG <= 0) return 100;
  const ratio = actualG / baselineG;
  return Math.round(Math.min(100, Math.max(0, (2 - ratio) * 50)));
};

module.exports = {
  EMISSION_FACTORS,
  CONGESTION_MULTIPLIERS,
  CARPOOL_EMISSION_FACTORS,
  getBaseEF,
  getCarpoolEF,
  calculateEmission,
  calculateGreenScore,
  calculateCarpoolCO2Saved,
};