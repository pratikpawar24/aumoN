export const API_URL = process.env.REACT_APP_API_URL || 'https://aumo-backend.onrender.com';
export const AI_URL  = process.env.REACT_APP_AI_URL  || 'https://pratikpawar24-aumo-ai.hf.space';

export const MAP_TILES = {
  osm:       'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  osmHot:    'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

export const MAP_ATTRIBUTIONS = {
  osm:       '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: '© <a href="https://www.esri.com">Esri</a>',
  carto:     '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
};

export const DEFAULT_CENTER = [20.5937, 78.9629];
export const DEFAULT_ZOOM   = 13;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 19;

export const VEHICLE_TYPES = [
  { value: 'car',        label: 'Car (Petrol)', icon: '🚗', emission: 150 },
  { value: 'electric',   label: 'Electric Car', icon: '⚡', emission: 55  },
  { value: 'bus',        label: 'Bus',          icon: '🚌', emission: 90  },
  { value: 'motorcycle', label: 'Motorcycle',   icon: '🏍️', emission: 100 },
  { value: 'bike',       label: 'Bicycle',      icon: '🚲', emission: 0   },
  { value: 'walk',       label: 'Walking',      icon: '🚶', emission: 0   },
];

export const OPTIMIZE_OPTIONS = [
  { value: 'carbon',   label: 'Eco Route',      icon: '🌿', color: '#22c55e', desc: 'Minimize CO₂' },
  { value: 'time',     label: 'Fastest Route',  icon: '⚡', color: '#ef4444', desc: 'Minimize time' },
  { value: 'distance', label: 'Shortest Route', icon: '📏', color: '#3b82f6', desc: 'Minimize distance' },
  { value: 'balanced', label: 'Balanced',       icon: '⚖️', color: '#f59e0b', desc: 'Balance all' },
];

export const ROUTE_COLORS = {
  carbon:   '#22c55e',
  time:     '#ef4444',
  distance: '#3b82f6',
  balanced: '#f59e0b',
};

export const CONGESTION_COLORS = {
  free_flow: '#22c55e',
  moderate:  '#f59e0b',
  heavy:     '#f97316',
  gridlock:  '#ef4444',
};

export const EMISSION_FACTORS = {
  car:        150,
  electric:   55,
  bus:        90,
  motorcycle: 100,
  bike:       0,
  walk:       0,
};

export const GREEN_SCORE_LABELS = [
  { min: 80, label: 'Eco Champion',    color: '#22c55e', icon: '🌟' },
  { min: 60, label: 'Green Commuter',  color: '#4ade80', icon: '🟢' },
  { min: 40, label: 'Eco Aware',       color: '#f59e0b', icon: '🟡' },
  { min: 20, label: 'Improving',       color: '#f97316', icon: '🟠' },
  { min: 0,  label: 'Getting Started', color: '#ef4444', icon: '🔴' },
];

export const POI_CATEGORIES = {
  bus_stop:   { icon: '🚌', color: '#f59e0b', label: 'Bus Stop'    },
  food_drink: { icon: '🍽️', color: '#ef4444', label: 'Food & Drink' },
  health:     { icon: '🏥', color: '#3b82f6', label: 'Health'       },
  education:  { icon: '🎓', color: '#8b5cf6', label: 'Education'    },
  finance:    { icon: '🏦', color: '#06b6d4', label: 'Finance'      },
  tourism:    { icon: '🏛️', color: '#ec4899', label: 'Tourism'      },
  office:     { icon: '🏢', color: '#64748b', label: 'Office'       },
  leisure:    { icon: '🌳', color: '#22c55e', label: 'Leisure'      },
  building:   { icon: '🏗️', color: '#94a3b8', label: 'Building'     },
  shop:       { icon: '🛍️', color: '#f97316', label: 'Shop'         },
};

export const TOAST_OPTIONS = {
  duration: 4000,
  style: {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '12px',
  },
};