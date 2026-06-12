# AumoN Mobile (Expo / React Native)

Android (and iOS) app for **AumoN — Sustainable Carpooling**, wired to the live
backend at `https://aumo-backend-h82m.onrender.com`.

> Built as an **Expo managed** app. It talks to the *real* deployed API
> (JWT-based email verification, `/api/routes/calculate`, `/api/carpool/*`,
> `/api/trips/*`, `/api/map/*`), not the generic endpoints from the original
> spec — those don't exist on the server.

## Features
- **Auth** — register, login, and **email OTP verification** using the backend's
  JWT flow (the token identifies the user; OTP is sent + verified server-side).
- **Map & routing** — origin/destination search (backend geocoding proxy),
  **Eco vs Fastest** with up to 3 selectable routes (selected solid, others
  dotted), drawn on OpenStreetMap tiles.
- **Live trip tracking** — GPS watch posts waypoints; shows distance remaining,
  ETA and a progress bar; auto-reroute prompt on wrong turns.
- **Carpool** — find nearby rides, schedule a ride (driver/passenger), history.
- **Dashboard** — CO₂ saved / trips / distance / time over week·month·year +
  green leaderboard.
- **Profile** — stats, default vehicle, sign out.

## Prerequisites
- Node 18+
- The **Expo Go** app on your phone (Android/iOS), or an Android emulator.

## Run it
```bash
cd mobile
npm install
npx expo start
```
Then scan the QR code with **Expo Go** (Android) / the Camera app (iOS).
Or press `a` for an Android emulator.

The backend URL is preset in `app.json → expo.extra.apiUrl`. For local backend
testing, change it to `http://10.0.2.2:5000` (Android emulator) or your machine's
LAN IP `http://192.168.x.x:5000` (physical device).

## Google Maps key (required for the map screen on Android)
The map uses `react-native-maps`, which on Android needs a free Google Maps key
to initialise (even though we render **OpenStreetMap** tiles on top):

1. https://console.cloud.google.com → new project → enable **Maps SDK for Android**.
2. Create an **API key** (restrict it to Android apps for safety).
3. Put it in `app.json` → `expo.android.config.googleMaps.apiKey`
   (replace `REPLACE_WITH_YOUR_GOOGLE_MAPS_ANDROID_API_KEY`).

Everything except the map screen works without the key. To use native maps you
need a **development build** (`npx expo run:android`) or EAS build — `react-native-maps`
is not fully supported in the prebuilt Expo Go on all SDKs.

## Build an APK
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # or --profile production
```
(Or `npx expo run:android` for a local debug build with Android Studio installed.)

## Project structure
```
mobile/
├── App.js
├── app.json            # Expo config (permissions, maps key, API url)
├── src/
│   ├── constants/config.js   # API_URL + real endpoints
│   ├── theme/theme.js        # green/dark brand tokens
│   ├── services/             # api, auth, route, carpool, map, trip, location
│   ├── context/AuthContext.js
│   ├── navigation/           # App / Auth / Main(tabs)
│   ├── components/common/     # Button, Input, Card, Loading, LocationSearchInput
│   └── screens/              # Auth, Map, Carpool, Dashboard, Profile
```

## Notes / limitations
- Maps need the Google key (above) on Android; the rest is key-free.
- Departure time uses preset chips (Now / +30m / +1h / +2h / Tomorrow 9 AM) to
  avoid a native date-picker dependency.
- Built and statically verified (syntax + import resolution) but not yet run on a
  physical device in this environment — test the flows on device and report any
  runtime issues.
