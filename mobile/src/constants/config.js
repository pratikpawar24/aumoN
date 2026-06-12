import Constants from 'expo-constants';

// Backend base URL. Defaults to the deployed Render service; override in
// app.json → expo.extra.apiUrl, or for local dev point at your machine
// (Android emulator: http://10.0.2.2:5000).
const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  'https://aumo-backend-h82m.onrender.com';

export const CONFIG = {
  API_URL,

  // Real backend endpoints (verified against the Express server).
  ENDPOINTS: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    VERIFY_TOKEN: '/api/auth/verify',
    SEND_VERIFICATION: '/api/auth/send-verification', // JWT-protected, no body
    VERIFY_EMAIL: '/api/auth/verify-email',           // JWT-protected, { otp }
    PROFILE: '/api/auth/profile',

    ROUTE_CALCULATE: '/api/routes/calculate',
    ROUTE_ANALYTICS: '/api/routes/analytics',

    TRIP_START: '/api/trips/start',
    TRIP_ACTIVE: '/api/trips/active',

    CARPOOL_REQUEST: '/api/carpool/request',
    CARPOOL_AVAILABLE: '/api/carpool/available',
    CARPOOL_HISTORY: '/api/carpool/history',

    MAP_AUTOCOMPLETE: '/api/map/autocomplete',
    MAP_REVERSE: '/api/map/reverse-geocode',

    LEADERBOARD: '/api/emissions/leaderboard',
  },

  // Mumbai default region.
  INITIAL_REGION: {
    latitude: 19.076,
    longitude: 72.8777,
    latitudeDelta: 0.6,
    longitudeDelta: 0.6,
  },
};

// Storage keys (mirror the web app's localStorage keys conceptually).
export const STORAGE = {
  TOKEN: 'aumo_token',
  USER: 'aumo_user',
};

export default CONFIG;
