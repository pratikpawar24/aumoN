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
  getBaseEF,
  calculateEmission,
  calculateGreenScore,
};