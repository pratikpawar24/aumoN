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
  dotted), drawn on **free OpenStreetMap** tiles (Leaflet in a WebView — **no
  Google Maps key, no API key of any kind required**).
- **Live trip tracking** — GPS watch posts waypoints; shows distance remaining,
  ETA and a progress bar; auto-reroute prompt on wrong turns.
- **Carpool** — find nearby rides, schedule a ride (driver/passenger), history,
  and a **chat inbox** to negotiate fares 1:1 with a driver in real time
  (Socket.IO); drivers can **confirm a passenger** straight from the chat.
- **Ride details** — tap a ride in History for full details, cancel, or jump
  to its messages.
- **Dashboard** — CO₂ saved / trips / distance / time over week·month·year +
  green leaderboard.
- **Profile** — stats, default vehicle, **profile photo upload** (camera roll →
  `/api/auth/avatar`), sign out.
- **Push notifications** — registers an Expo token after login; the backend
  pushes on new chat messages, ride confirmations and carpool matches.
- **Admin** — an extra tab for admin accounts: live stats, user search, and
  verify / block / unblock actions.

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

## Maps — 100% free, no API key
The map screen renders **OpenStreetMap** tiles with **Leaflet inside a WebView**
(`react-native-webview`) — the same free stack as the AumoN web app. There is
**no Google Maps key and no map API key to configure**, and it runs fine in
**Expo Go** (no native/dev build needed just for the map).

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
- Maps are fully free/key-free (OpenStreetMap + Leaflet in a WebView).
- Departure time uses preset chips (Now / +30m / +1h / +2h / Tomorrow 9 AM) to
  avoid a native date-picker dependency.
- Built and statically verified (syntax + import resolution) but not yet run on a
  physical device in this environment — test the flows on device and report any
  runtime issues.
