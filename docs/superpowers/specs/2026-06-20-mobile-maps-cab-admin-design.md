# AumoN — Mobile Google-Maps UI, Cab-Booking Interface, Delete Rule & Admin Reports

**Date:** 2026-06-20
**Status:** Approved design — ready for implementation planning
**Scope:** mobile app (`mobile/`), backend (`backend/`), web frontend admin (`frontend/`)

## Summary

Four pieces of work, scoped by the user's answers:

1. **Google-Maps-style map interface — mobile only.** Restyle the existing key-free Leaflet/OSM WebView map and the `MapScreen` layout to look and feel like Google Maps. No Google Maps SDK, no API key (respects the "defer all keys" rule), stays in Expo Go. The website map is untouched.
2. **Cab-booking-style interface — mobile carpool only.** A Uber/Ola-like booking UI in the carpool section, built on the **existing** endpoints. No new booking backend (no accept/decline service, no live-tracking infra). Fare and ETA are computed client-side.
3. **Layout / overlap pass — whole mobile app.** Remove overlapping, mis-proportioned components; anchor floating UI to safe-area + tab-bar insets.
4. **Driver/passenger ride-deletion rule.** A ride can be deleted/cancelled only if departure is more than **6 hours** away. Applies to **both roles**. Enforced in the backend (so web inherits it) and reflected in the mobile UI.
5. **Admin detailed reports + CSV — mobile and web.** Total rides searched, scheduled rides in detail, and breakdowns by status/role/day; viewable and downloadable as CSV in both the mobile Admin screen and the web admin area.

### Decisions locked by the user
- Map approach: **Restyle Leaflet/OSM** (key-free), mobile only.
- Cab booking: **interface only**, mobile only, existing endpoints.
- Admin reports + CSV: **both mobile and web**.
- Delete rule: **block within 6h, both roles**.

### Non-goals
- No Google Maps / Mapbox SDK; no native rebuild.
- No new carpool booking state machine (accept/decline), no real-time driver-location tracking feature beyond what `tripService` already does.
- No changes to the website map.
- No new API keys introduced in this work.

---

## Workstream 1 — Google-Maps-style map (mobile only)

**Files:** `mobile/src/components/map/LeafletMap.js`, `mobile/src/screens/Map/MapScreen.js`, plus a new reusable bottom-sheet component.

### 1.1 Map rendering (`LeafletMap.js`)
The map is Leaflet inside a `react-native-webview`, driven by `window.AUMO.update(data)`. Changes, all inside the HTML/JS string:

- **Tiles:** swap dark OSM for a light Google-like basemap — CartoDB **Voyager** (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`), key-free, retina-aware. Keep OSM attribution.
- **Markers:** replace flat circle markers with Google-style **teardrop pins** (green origin, red destination) via `L.divIcon` + inline SVG. Keep the **blue "my location" dot** but add a translucent accuracy/halo ring; optional heading later.
- **Routes:** Google's two-tone polyline — draw each selected route twice: a darker **casing** underneath (weight ~9) and a blue **core** on top (weight ~6, `#4285F4`); alternates stay thin grey and dashed. Preserve the existing `routeTap` → `onSelectRoute` behaviour.
- **Tap-to-drop pin:** add a `map.on('click')` that posts `{type:'mapTap', lat, lng}`; `MapScreen` reverse-geocodes (existing `mapService`/`locationService`) and sets whichever of origin/destination is empty (or the currently "active" field).
- Keep `fitToken`/`centerToken`/`follow` token mechanism unchanged.

### 1.2 Layout (`MapScreen.js`) — fixes the overlap problem
Today the recenter FAB (`bottom:190`), route cards (`bottom:96`) and trip bar (`bottom:lg`) are absolutely positioned with hardcoded offsets that overlap on small screens and sit under the tab bar.

- Introduce a **`MapBottomSheet`** (new component, simple snap states: collapsed / mid / expanded — no extra native dependency, built with `View` + `Animated`/`PanResponder` or a static two-snap version if simpler) anchored to `useSafeAreaInsets().bottom` + tab-bar height.
- Move into the sheet: From/To inputs, Eco/Fastest toggle, Find-route button, the route option cards, and the Start/Stop trip control. The sheet header shows the selected route summary (time · distance · CO₂).
- **Top search bar:** a Google-style rounded "Search here" pill at the top that focuses the From/To form (expands the sheet). Replaces the always-open control card.
- The recenter (my-location) FAB floats just above the sheet's collapsed height — position derived from the sheet height, never a magic number.

---

## Workstream 2 — Cab-booking interface (mobile carpool only)

**Files:** `mobile/src/screens/Carpool/FindRides.js`, `RideDetailsScreen.js`, `ScheduleRide.js`, `CarpoolScreen.js`, a new `BookingSheet` component, and `mobile/src/utils/helpers.js` (fare/ETA helpers). **No backend changes.**

This is presentation only, layered over the existing endpoints (`getAvailable`, `createRequest`, chat, `cancelRequest`).

- **Fare & ETA helpers (client-side):**
  - ETA from `haversineKm(pickup, dropoff)` ÷ assumed average speed (e.g. 28 km/h urban) → minutes; show as a range.
  - Estimated fare = `round(km × ₹/km)` reusing the existing ₹4/km convention from `ScheduleRide`; when the driver set a `price`, show that as the actual fare and the estimate as secondary.
- **Cab-style ride cards (`FindRides`):** driver avatar + name + green score, **fare** prominent, **ETA / distance** chips, seats, pickup→drop with the two-dot leg style, and a primary **"Book"** action plus a secondary **"Message"**.
- **`BookingSheet` (new):** a bottom sheet that opens when "Book" is tapped — shows pickup→drop, seats stepper, fare & ETA, and confirms by calling the existing `createRequest` (passenger seeking that ride's route) and/or opening chat. No new server flow; copy/labels make it feel like a cab booking.
- **Ride status strip:** a small presentational stepper mapping the existing `status` (`pending → matching → matched → completed`, `cancelled` shown distinctly) used in `RideDetailsScreen` and history cards. Driven entirely by existing data.
- **`ScheduleRide`** gets the same cab-style visual language (fare/ETA preview before submit) without changing its payload.

---

## Workstream 3 — Layout / overlap pass (whole mobile app)

**Files:** all `mobile/src/screens/**`, `mobile/src/theme/theme.js` (add helpers/spacing if needed).

- Add a shared **bottom-inset helper** (hook or constant) combining `useSafeAreaInsets().bottom` + the 60px tab bar so screen content and floating controls never sit under the tab bar.
- Audit and fix:
  - **MapScreen** (primary offender — handled in WS1).
  - **CarpoolScreen** tab row: currently `Text` elements used as buttons (`overflow:hidden` hack) — convert to proper touchable pill tabs with consistent height.
  - List screens (`FindRides`, `RideHistory`, `AdminScreen`): ensure `contentContainerStyle` bottom padding clears the tab bar.
  - Normalize card padding/`gap` and font scale so components don't visually collide ("proper ratio").
- Acceptance: on a small device (e.g. 360×640) no two components overlap and nothing is clipped by the tab bar or notch.

---

## Workstream 4 — Ride-deletion rule (6h, both roles)

**Files:** `backend/src/controllers/carpoolController.js` (`cancelRequest`), `mobile/src/screens/Carpool/RideDetailsScreen.js`.

- **Backend (source of truth, so web inherits it):** in `cancelRequest`, after loading the request and the existing completed/cancelled guard, compute `msToDeparture = new Date(request.departureTime) - Date.now()`. If `msToDeparture < 6 * 60 * 60 * 1000`, return `400` with `{ success:false, message: 'Rides can only be deleted more than 6 hours before departure.' }`. Applies regardless of `role`.
  - Edge case: if `departureTime` is already in the past, keep allowing cancel (housekeeping) — the rule targets the 0–6h pre-departure window only. (Implementation: block only when `0 <= msToDeparture < 6h`.)
- **Mobile UI:** in `RideDetailsScreen`, compute the same window; when inside it, disable the Cancel button and show helper text "Can't delete within 6 hours of departure." The server check remains authoritative.

---

## Workstream 5 — Admin detailed reports + CSV (mobile + web)

**Files:** `backend/src/controllers/adminController.js`, `backend/src/routes/adminRoutes.js`, a new `backend/src/models/SearchLog.js` and a hook in `backend/src/controllers/routeController.js`; `mobile/src/services/adminService.js` + `mobile/src/screens/Admin/AdminScreen.js`; `frontend/src/services/adminService.js` + `frontend/src/pages/admin/AdminReports.jsx`.

### 5.1 "Rides searched in total" — durable search logging (backend)
**Problem:** the `Route` collection has a **7-day TTL** (`cachedAt` `expireAfterSeconds: 604800`) and is deduped per user, so it cannot give an honest historical "total searches" count.

**Solution:** add a lightweight, append-only **`SearchLog`** model written once per route calculation:
```
SearchLog { userId, originAddress, destAddress, distanceKm, optimizeFor, vehicleType, createdAt }
```
Write it in `routeController.calculate` (the durable backend hook hit by both web and mobile via `/api/routes/calculate`). It is never TTL'd, so totals accumulate. (No new index beyond `createdAt`.)

### 5.2 Report endpoints (backend)
Extend the admin reports surface (keep existing `/api/admin/reports` working; add detail endpoints):
- `GET /api/admin/reports` — keep current app rollup + topUsers; **add** `searches.total`, `searches.last30dDaily[]`, and `scheduled` summary (counts by status and by role).
- `GET /api/admin/reports/searches` — total + daily breakdown (from `SearchLog`), optional `from`/`to`.
- `GET /api/admin/reports/scheduled` — every `CarpoolRequest` in detail (rider name/email via populate, pickup/drop addresses, departureTime, role, status, seats, fare), paginated, with `from`/`to`/`status`/`role` filters.
- All under the existing `protect, requireAdmin` middleware.

### 5.3 Web reports (frontend `AdminReports.jsx`)
- Add summary stat cards: **Total rides searched**, searches (30d), scheduled rides by status.
- Add a **Scheduled rides** detail table (rider, route, time, role, status, fare) with its own **Export CSV**.
- Add **Export CSV** for the searches breakdown. Reuse the existing Blob-download pattern already in the file. Keep the current "Top users" table + its CSV.

### 5.4 Mobile reports (`AdminScreen.js`)
- Add a **Reports** section (below the existing stat grid, or a segmented toggle Users | Reports): summary cards (total searched, scheduled by status), a scheduled-rides detail list, and a searches breakdown.
- **Download CSV on mobile:** generate the CSV string client-side and export via `expo-sharing` + `expo-file-system` (write to `cacheDirectory`, then `Sharing.shareAsync`). These Expo packages must be added to `mobile/package.json`. A **"Download CSV"** button per report.
- Extend `mobile/src/services/adminService.js` with `getReports`, `getScheduledReport`, `getSearchesReport`.

---

## Data flow & interfaces (summary)

- **Map:** RN `MapScreen` → `LeafletMap` WebView via `injectJavaScript(window.AUMO.update(...))`; WebView → RN via `postMessage` (`ready`, `routeTap`, new `mapTap`). Reverse-geocode through existing `mapService`/`locationService`.
- **Cab interface:** carpool screens → existing `carpoolService` endpoints; fare/ETA from new pure helpers in `helpers.js`. No new server contract.
- **Delete rule:** mobile/web → `PATCH /api/carpool/request/:id/cancel` → server-enforced 6h window.
- **Admin reports:** clients → `adminService` → `/api/admin/reports*`; `Route` calculation → writes `SearchLog`. CSV built client-side in each client.

## Testing / verification

Repo has no automated test harness (per CLAUDE.md). Verification is manual:
- Map: light tiles, pins, two-tone route, tap-to-drop, no overlap on a 360×640 viewport; recenter works; trip tracking still functions.
- Cab UI: ride cards show fare/ETA; Book opens sheet and creates a request; status strip reflects real status.
- Delete rule: cancelling a ride >6h out succeeds; <6h out returns the 400 message on both web and mobile; UI disables the button.
- Admin: `SearchLog` rows accumulate on route calculation; reports show totals/scheduled detail; CSV exports open the share sheet (mobile) and download a file (web) with correct rows.
- Backend smoke: `/api/admin/reports`, `/reports/searches`, `/reports/scheduled` return expected shapes for an admin token and 403 for a normal user.

## Rollout / deferrals

- **API keys:** none introduced (consistent with the deferral ledger).
- After each completed phase, push directly to `origin/main` (per workflow), **no Claude attribution** in commits.
- Record any "did not do" items in the phase-deferrals ledger.

## Open implementation notes (not blockers)
- Bottom sheet: prefer a dependency-free implementation; only add a sheet library if the hand-rolled version proves janky.
- `SearchLog` could later power a richer search-analytics view; out of scope now beyond the total + 30d daily.
