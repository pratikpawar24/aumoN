# Mobile Google-Maps UI, Cab-Booking Interface, Delete Rule & Admin Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the AumoN mobile app a Google-Maps-style map and a cab-booking-style carpool interface, fix component overlap/proportion across the app, enforce a 6-hour ride-deletion cutoff for both roles, and add detailed admin reports with CSV export on both mobile and web.

**Architecture:** Mobile map stays a key-free Leaflet/OSM WebView (`react-native-webview`) restyled to look like Google Maps and driven from React Native via injected JS; the carpool "cab" experience is pure presentation over existing endpoints with client-side fare/ETA. The 6h rule is enforced server-side in the carpool controller (so the web app inherits it) and mirrored in mobile UI. Admin reports derive from the existing `Ride` (searches) and `CarpoolRequest` (scheduled) collections via new aggregation endpoints, with CSV built client-side in each client.

**Tech Stack:** Expo 51 / React Native 0.74, react-native-webview + Leaflet 1.9, react-navigation bottom tabs, react-native-safe-area-context; Node/Express + Mongoose backend; React 18 (CRA) + Tailwind web; new mobile deps `expo-file-system` + `expo-sharing`.

## Global Constraints

- **No new API keys** anywhere in this work (defer-keys rule).
- **No Google Maps / Mapbox SDK, no native rebuild** — map stays Leaflet/OSM in a WebView, must keep working in Expo Go.
- **Map changes are mobile-only** — do not touch `frontend/` map code.
- **No new carpool backend flow** — cab booking is interface-only over existing endpoints (`/api/carpool/*`, `/api/chat/*`).
- **Git commits/PRs must NOT mention Claude/Anthropic and must NOT add Co-Authored-By: Claude.**
- **After each completed Phase, push directly to `origin/main`.**
- Repo has **no automated test harness** (backend `test` is a stub, frontend uses `--passWithNoTests`). "Tests" in this plan are explicit **manual verification steps** with exact commands/observations — do not claim automated passes.
- Money is INR; fare convention is **₹4/km** (matches `ScheduleRide`). Urban ETA speed assumption: **28 km/h**.
- Mobile theme tokens live in `mobile/src/theme/theme.js` (`colors`, `spacing`, `radius`, `font`) — reuse them, do not hardcode colors.

---

## Phase 1 — Driver/passenger 6-hour deletion rule (smallest, highest-value, backend-authoritative)

### Task 1.1: Enforce the 6h cancel window in the backend

**Files:**
- Modify: `backend/src/controllers/carpoolController.js` (`cancelRequest`, ~lines 207-223)

**Interfaces:**
- Consumes: existing `CarpoolRequest` doc with `departureTime: Date`, `status` enum.
- Produces: `cancelRequest` now returns `400` `{ success:false, message, code:'CANCEL_WINDOW' }` when departure is 0–6h away.

- [ ] **Step 1: Add the window guard to `cancelRequest`**

In `backend/src/controllers/carpoolController.js`, replace the body of `exports.cancelRequest` with:

```js
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await CarpoolRequest.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${request.status} request.` });
    }

    // A ride can only be deleted more than 6 hours before departure (both
    // roles). The window is the 0–6h pre-departure band; rides already in the
    // past stay cancellable for housekeeping.
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const msToDeparture = new Date(request.departureTime).getTime() - Date.now();
    if (msToDeparture >= 0 && msToDeparture < SIX_HOURS_MS) {
      return res.status(400).json({
        success: false,
        code: 'CANCEL_WINDOW',
        message: 'Rides can only be deleted more than 6 hours before departure.',
      });
    }

    request.status = 'cancelled';
    await request.save();
    res.json({ success: true, message: 'Request cancelled.' });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Manual verification — outside the window (allowed)**

Start the backend (`cd backend && npm run dev`). With a valid user JWT and a `CarpoolRequest` whose `departureTime` is >6h away:

Run:
```bash
curl -s -X PATCH http://localhost:5000/api/carpool/request/<ID_FAR>/cancel \
  -H "Authorization: Bearer <TOKEN>"
```
Expected: `{"success":true,"message":"Request cancelled."}`

- [ ] **Step 3: Manual verification — inside the window (blocked)**

With a `CarpoolRequest` whose `departureTime` is <6h away (e.g. 2h):

Run:
```bash
curl -s -X PATCH http://localhost:5000/api/carpool/request/<ID_NEAR>/cancel \
  -H "Authorization: Bearer <TOKEN>"
```
Expected: HTTP 400, body `{"success":false,"code":"CANCEL_WINDOW","message":"Rides can only be deleted more than 6 hours before departure."}`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/carpoolController.js
git commit -m "feat(carpool): block ride deletion within 6h of departure for both roles"
```

### Task 1.2: Reflect the 6h rule in the mobile RideDetails UI

**Files:**
- Modify: `mobile/src/screens/Carpool/RideDetailsScreen.js`

**Interfaces:**
- Consumes: `ride.departureTime`, the server `CANCEL_WINDOW` 400 from Task 1.1, `apiError` from `utils/helpers`.
- Produces: a disabled Cancel button + helper text when inside the window; surfaces server message on failure.

- [ ] **Step 1: Compute the window and gate the button**

In `RideDetailsScreen.js`, after the existing `const cancellable = ...` line (currently line 24), add:

```js
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const msToDeparture = new Date(ride.departureTime).getTime() - Date.now();
  const withinDeleteWindow = msToDeparture >= 0 && msToDeparture < SIX_HOURS_MS;
  const canDelete = cancellable && !withinDeleteWindow;
```

- [ ] **Step 2: Show the server message on failure**

In the `cancel` function's `catch (e)` block, the existing `Alert.alert('Error', apiError(e));` already surfaces the backend message (`apiError` reads `response.data.message`). Leave as-is — verify it shows the 6h message.

- [ ] **Step 3: Replace the cancel button block with a gated version**

Replace the line:

```js
        {cancellable && <Button title="Cancel ride" variant="danger" onPress={cancel} loading={cancelling} />}
```

with:

```js
        {cancellable && (
          canDelete ? (
            <Button title="Cancel ride" variant="danger" onPress={cancel} loading={cancelling} />
          ) : (
            <View>
              <Button title="Cancel ride" variant="danger" onPress={cancel} loading={cancelling} disabled />
              <Text style={styles.windowNote}>Rides can only be deleted more than 6 hours before departure.</Text>
            </View>
          )
        )}
```

- [ ] **Step 4: Add the helper-text style**

In the `StyleSheet.create({...})` block, add:

```js
  windowNote: { color: colors.textSubtle, fontSize: font.tiny, textAlign: 'center', marginTop: 6 },
```

- [ ] **Step 5: Verify `Button` supports `disabled`**

Run:
```bash
grep -n "disabled" mobile/src/components/common/Button.js
```
Expected: a `disabled` prop is destructured and applied (button dims / no press). If absent, add `disabled` to the component's props and pass it to `TouchableOpacity` with `style` opacity 0.5 when true.

- [ ] **Step 6: Manual verification (Expo)**

Run `cd mobile && npm start`, open a ride departing in <6h from History → details. Expected: Cancel button is dimmed/disabled with the helper note. Open a ride departing >6h out: Cancel works and removes it.

- [ ] **Step 7: Commit + push Phase 1**

```bash
git add mobile/src/screens/Carpool/RideDetailsScreen.js mobile/src/components/common/Button.js
git commit -m "feat(mobile): disable ride deletion within 6h of departure with helper note"
git push origin main
```

---

## Phase 2 — Admin detailed reports + CSV (backend, then web, then mobile)

### Task 2.1: Backend report endpoints (searches + scheduled detail)

**Files:**
- Modify: `backend/src/controllers/adminController.js` (extend `getReports`; add `getSearchesReport`, `getScheduledReport`)
- Modify: `backend/src/routes/adminRoutes.js` (register the two new routes)

**Interfaces:**
- Consumes: `Ride` (durable per-search records), `CarpoolRequest`, existing `protect, requireAdmin` middleware.
- Produces:
  - `GET /api/admin/reports` → existing shape **plus** `searches:{ total, last30dDaily:[{date,count}] }` and `scheduled:{ total, byStatus:{...}, byRole:{...} }`.
  - `GET /api/admin/reports/searches` → `{ success, total, daily:[{date,count}], byVehicleType:[{type,count}], byOptimizeFor:[{mode,count}] }`.
  - `GET /api/admin/reports/scheduled` → `{ success, total, rides:[{_id,riderName,riderEmail,pickup,dropoff,departureTime,role,status,seats,price,createdAt}], pagination }`.

- [ ] **Step 1: Extend `getReports` with searches + scheduled summaries**

In `adminController.js`, inside `exports.getReports`, change the `Promise.all` to also compute the new aggregates. Replace the existing `const [userAgg, carpoolRides, topUsers] = await Promise.all([...])` block and the response with:

```js
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [userAgg, carpoolRides, topUsers, searchTotal, searchDaily, scheduledByStatus, scheduledByRole] = await Promise.all([
      User.aggregate([
        { $match: { role: 'user' } },
        {
          $group: {
            _id: null,
            users: { $sum: 1 },
            verified: { $sum: { $cond: ['$emailVerified', 1, 0] } },
            blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
            totalTrips: { $sum: '$totalTrips' },
            totalDistanceKm: { $sum: '$totalDistanceKm' },
            totalCO2SavedG: { $sum: '$totalCO2Saved' },
          },
        },
      ]),
      CarpoolRequest.countDocuments({}),
      User.find({ role: 'user' })
        .select('name email totalTrips totalCO2Saved totalDistanceKm carpoolsJoined')
        .sort({ totalCO2Saved: -1 })
        .limit(50)
        .lean(),
      Ride.countDocuments({}),
      Ride.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      CarpoolRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CarpoolRequest.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    const a = userAgg[0] || {};
    const toMap = (arr) => arr.reduce((m, x) => { m[x._id || 'unknown'] = x.count; return m; }, {});
    res.json({
      success: true,
      app: {
        users: a.users || 0,
        verified: a.verified || 0,
        blocked: a.blocked || 0,
        totalTrips: a.totalTrips || 0,
        totalDistanceKm: Math.round(a.totalDistanceKm || 0),
        totalCO2SavedKg: Math.round((a.totalCO2SavedG || 0) / 1000),
        carpoolRides,
      },
      searches: {
        total: searchTotal,
        last30dDaily: searchDaily.map((d) => ({ date: d._id, count: d.count })),
      },
      scheduled: {
        total: carpoolRides,
        byStatus: toMap(scheduledByStatus),
        byRole: toMap(scheduledByRole),
      },
      topUsers: topUsers.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        totalTrips: u.totalTrips || 0,
        totalCO2SavedKg: Math.round((u.totalCO2Saved || 0) / 1000),
        totalDistanceKm: Math.round(u.totalDistanceKm || 0),
        carpoolsJoined: u.carpoolsJoined || 0,
      })),
    });
```

(Keep the surrounding `try/catch (err) { next(err); }`.)

- [ ] **Step 2: Add `getSearchesReport`**

Append to `adminController.js` (before `module.exports`-style end; it uses `exports.`):

```js
// ── Reports: route-search breakdown (from durable Ride records) ───────────────
exports.getSearchesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    const [total, daily, byVehicleType, byOptimizeFor] = await Promise.all([
      Ride.countDocuments(match),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Ride.aggregate([
        { $match: match },
        { $group: { _id: '$optimizeFor', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      success: true,
      total,
      daily: daily.map((d) => ({ date: d._id, count: d.count })),
      byVehicleType: byVehicleType.map((d) => ({ type: d._id || 'unknown', count: d.count })),
      byOptimizeFor: byOptimizeFor.map((d) => ({ mode: d._id || 'unknown', count: d.count })),
    });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 3: Add `getScheduledReport`**

Append to `adminController.js`:

```js
// ── Reports: scheduled carpool rides in detail ───────────────────────────────
exports.getScheduledReport = async (req, res, next) => {
  try {
    const { from, to, status, role, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = { $in: String(status).split(',').map((s) => s.trim()) };
    if (role && ['driver', 'passenger'].includes(role)) filter.role = role;
    if (from || to) {
      filter.departureTime = {};
      if (from) filter.departureTime.$gte = new Date(from);
      if (to) filter.departureTime.$lte = new Date(to);
    }
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (parseInt(page, 10) - 1) * lim;
    const [docs, total] = await Promise.all([
      CarpoolRequest.find(filter)
        .sort({ departureTime: -1 })
        .skip(skip)
        .limit(lim)
        .populate('userId', 'name email')
        .lean(),
      CarpoolRequest.countDocuments(filter),
    ]);
    const rides = docs.map((r) => ({
      _id: r._id,
      riderName: r.userId?.name || '',
      riderEmail: r.userId?.email || '',
      pickup: r.pickup?.address || `${r.pickup?.lat},${r.pickup?.lng}`,
      dropoff: r.dropoff?.address || `${r.dropoff?.lat},${r.dropoff?.lng}`,
      departureTime: r.departureTime,
      role: r.role,
      status: r.status,
      seats: r.role === 'driver' ? r.seatsAvailable : r.seatsNeeded,
      price: r.price,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, total, rides, pagination: { page: parseInt(page, 10), limit: lim, total } });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Register the routes**

In `backend/src/routes/adminRoutes.js`, after the existing `router.get('/reports', adminController.getReports);` line, add:

```js
router.get('/reports/searches',  adminController.getSearchesReport);
router.get('/reports/scheduled', adminController.getScheduledReport);
```

- [ ] **Step 5: Manual verification**

Start backend. With an **admin** JWT:

```bash
curl -s http://localhost:5000/api/admin/reports -H "Authorization: Bearer <ADMIN>" | head -c 400
curl -s http://localhost:5000/api/admin/reports/searches -H "Authorization: Bearer <ADMIN>"
curl -s "http://localhost:5000/api/admin/reports/scheduled?limit=5" -H "Authorization: Bearer <ADMIN>"
```
Expected: `/reports` now includes `searches` and `scheduled` keys; `/reports/searches` returns `total` + `daily` arrays; `/reports/scheduled` returns `rides[]` with `riderName`/`pickup`/`status`.

With a **non-admin** JWT, `/reports/searches` returns 403.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/adminController.js backend/src/routes/adminRoutes.js
git commit -m "feat(admin): add searches + scheduled-ride detail report endpoints"
```

### Task 2.2: Web admin reports UI + CSV (searches & scheduled)

**Files:**
- Modify: `frontend/src/services/adminService.js` (add `getSearchesReport`, `getScheduledReport`)
- Modify: `frontend/src/pages/admin/AdminReports.jsx`

**Interfaces:**
- Consumes: Task 2.1 endpoints.
- Produces: new web service methods + report sections with per-table CSV download (reusing the file's existing Blob pattern).

- [ ] **Step 1: Add web service methods**

Open `frontend/src/services/adminService.js`, find the `getReports` method, and add alongside it:

```js
  getSearchesReport: async (params = {}) => (await api.get('/api/admin/reports/searches', { params })).data,
  getScheduledReport: async (params = {}) => (await api.get('/api/admin/reports/scheduled', { params })).data,
```

(Match the file's existing export style — if it exports an object literal, add these as properties; verify with `grep -n "getReports" frontend/src/services/adminService.js`.)

- [ ] **Step 2: Add a reusable CSV helper inside `AdminReports.jsx`**

Below the imports in `AdminReports.jsx`, add:

```js
const downloadCsv = (filename, header, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([[header, body].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
```

Then refactor the existing `exportCsv` to call it:

```js
  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      'aumon-user-report.csv',
      'Name,Email,Trips,CO2 saved (kg),Distance (km),Carpools joined',
      data.topUsers.map((u) => [u.name, u.email, u.totalTrips, u.totalCO2SavedKg, u.totalDistanceKm, u.carpoolsJoined]),
    );
  };
```

- [ ] **Step 3: Load scheduled rides + searches detail on mount**

Replace the single `useEffect` data load with:

```js
  const [scheduled, setScheduled] = useState(null);
  const [searches, setSearches] = useState(null);

  useEffect(() => {
    adminService.getReports().then(setData).catch(() => {});
    adminService.getScheduledReport({ limit: 200 }).then(setScheduled).catch(() => {});
    adminService.getSearchesReport().then(setSearches).catch(() => {});
    setLoading(false);
  }, []);
```

(Keep the existing `loading`/`data` state declarations; add the two new `useState` imports already covered by `useState`.)

- [ ] **Step 4: Add summary stat cards for searches & scheduled**

Inside the stats grid `<div className="grid ...">`, add two cards after the existing ones:

```jsx
        <Stat icon={Route} label="Rides searched" value={searches?.total ?? data?.searches?.total ?? 0} />
        <Stat icon={Car} label="Scheduled rides" value={data?.scheduled?.total ?? 0} />
```

- [ ] **Step 5: Add a Scheduled-rides table with its own CSV export**

Before the closing `</div>` of the component's root, add:

```jsx
      <div className="rounded-xl border border-indigo-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between">
          <h2 className="font-semibold text-white">Scheduled rides ({scheduled?.total ?? 0})</h2>
          <button
            onClick={() => scheduled && downloadCsv(
              'aumon-scheduled-rides.csv',
              'Rider,Email,Pickup,Dropoff,Departure,Role,Status,Seats,Fare',
              scheduled.rides.map((r) => [r.riderName, r.riderEmail, r.pickup, r.dropoff,
                new Date(r.departureTime).toLocaleString(), r.role, r.status, r.seats, r.price ?? '']),
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20">
            <Download className="w-4 h-4" />CSV
          </button>
        </div>
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/5">
                <th className="px-4 py-2 font-medium">Rider</th>
                <th className="px-4 py-2 font-medium">Route</th>
                <th className="px-4 py-2 font-medium">Departure</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Fare</th>
              </tr>
            </thead>
            <tbody>
              {(scheduled?.rides || []).map((r) => (
                <tr key={r._id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">{r.riderName}<span className="block text-xs text-slate-500">{r.riderEmail}</span></td>
                  <td className="px-4 py-2 text-slate-300 max-w-[260px] truncate">{r.pickup} → {r.dropoff}</td>
                  <td className="px-4 py-2 text-slate-300">{new Date(r.departureTime).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-300">{r.role}</td>
                  <td className="px-4 py-2 text-slate-300">{r.status}</td>
                  <td className="px-4 py-2 text-slate-300">{r.price != null ? `₹${r.price}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
```

- [ ] **Step 6: Manual verification**

Run `cd frontend && npm start`, log in as admin, open the Reports page. Expected: "Rides searched" and "Scheduled rides" cards show numbers; the Scheduled-rides table lists rows; clicking its **CSV** button downloads `aumon-scheduled-rides.csv` with matching rows; the original user-report CSV still works.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/adminService.js frontend/src/pages/admin/AdminReports.jsx
git commit -m "feat(web-admin): scheduled-ride detail table, searches stats, CSV exports"
```

### Task 2.3: Mobile admin reports UI + CSV (share sheet)

**Files:**
- Modify: `mobile/package.json` (add `expo-file-system`, `expo-sharing`)
- Modify: `mobile/src/services/adminService.js` (add report methods)
- Create: `mobile/src/utils/csv.js` (CSV build + share helper)
- Modify: `mobile/src/screens/Admin/AdminScreen.js` (Users | Reports segmented view)

**Interfaces:**
- Consumes: Task 2.1 endpoints.
- Produces: `exportCsv(filename, header, rows)` in `utils/csv.js`; `adminService.getReports/getSearchesReport/getScheduledReport`.

- [ ] **Step 1: Add the Expo deps**

Run:
```bash
cd mobile && npx expo install expo-file-system expo-sharing
```
Expected: both added to `dependencies` in `mobile/package.json` at Expo-51-compatible versions.

- [ ] **Step 2: Add mobile admin service methods**

In `mobile/src/services/adminService.js`, add to the `adminService` object:

```js
  getReports: async () => (await api.get('/api/admin/reports')).data,
  getSearchesReport: async (params = {}) => (await api.get('/api/admin/reports/searches', { params })).data,
  getScheduledReport: async (params = {}) => (await api.get('/api/admin/reports/scheduled', { params })).data,
```

- [ ] **Step 3: Create the CSV helper**

Create `mobile/src/utils/csv.js`:

```js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Build a CSV string and open the native share sheet so the admin can save or
// send it. Returns the file URI written to the cache directory.
export const exportCsv = async (filename, header, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((r) => r.map(esc).join(',')).join('\n');
  const csv = [header, body].join('\n');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
  }
  return uri;
};
```

- [ ] **Step 4: Add a Users | Reports toggle and Reports content to AdminScreen**

In `mobile/src/screens/Admin/AdminScreen.js`:

(a) Add imports at the top:
```js
import { exportCsv } from '../../utils/csv';
```

(b) Add state near the other `useState` calls:
```js
  const [view, setView] = useState('users'); // 'users' | 'reports'
  const [reports, setReports] = useState(null);
  const [scheduled, setScheduled] = useState(null);
```

(c) Add a loader and call it from `initial`:
```js
  const loadReports = useCallback(async () => {
    try {
      const [rep, sched] = await Promise.all([
        adminService.getReports(),
        adminService.getScheduledReport({ limit: 200 }),
      ]);
      setReports(rep); setScheduled(sched);
    } catch (_) {}
  }, []);
```
And in `initial`, change the `Promise.all([loadStats(), loadUsers('')])` to `Promise.all([loadStats(), loadUsers(''), loadReports()])`.

(d) In the `ListHeaderComponent`, after the stat grid `</View>`, add the segmented toggle:
```jsx
            <View style={styles.segment}>
              {['users', 'reports'].map((v) => (
                <TouchableOpacity key={v} style={[styles.segBtn, view === v && styles.segBtnOn]} onPress={() => setView(v)}>
                  <Text style={[styles.segText, view === v && styles.segTextOn]}>{v === 'users' ? 'Users' : 'Reports'}</Text>
                </TouchableOpacity>
              ))}
            </View>
```

(e) Make the list data view-aware: change the `FlatList` `data={users}` to `data={view === 'users' ? users : (scheduled?.rides || [])}` and give `keyExtractor` a fallback: `keyExtractor={(item) => item._id}`.

(f) Render reports rows: wrap the existing user `renderItem` body in a branch. Replace `renderItem={({ item: u }) => ( ...user card... )}` with:
```jsx
        renderItem={({ item }) =>
          view === 'users' ? (
            renderUserCard(item)
          ) : (
            <View style={styles.userCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{item.riderName || 'Rider'}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{item.pickup} → {item.dropoff}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {new Date(item.departureTime).toLocaleString()} · {item.role} · {item.status}{item.price != null ? ` · ₹${item.price}` : ''}
                </Text>
              </View>
            </View>
          )
        }
```
Extract the existing user-card JSX into a `renderUserCard = (u) => (...)` function defined in the component body (move the current JSX verbatim).

(g) When `view === 'reports'`, show report summary cards + CSV buttons. Inside `ListHeaderComponent`, after the segment toggle, add:
```jsx
            {view === 'reports' && (
              <View style={{ gap: 10 }}>
                <View style={styles.grid}>
                  <View style={styles.stat}><Text style={styles.statValue}>{reports?.searches?.total ?? 0}</Text><Text style={styles.statLabel}>Rides searched</Text></View>
                  <View style={styles.stat}><Text style={styles.statValue}>{reports?.scheduled?.total ?? 0}</Text><Text style={styles.statLabel}>Scheduled rides</Text></View>
                  <View style={styles.stat}><Text style={styles.statValue}>{reports?.scheduled?.byStatus?.matched ?? 0}</Text><Text style={styles.statLabel}>Matched</Text></View>
                </View>
                <TouchableOpacity
                  style={styles.csvBtn}
                  onPress={() => scheduled && exportCsv(
                    'aumon-scheduled-rides.csv',
                    'Rider,Email,Pickup,Dropoff,Departure,Role,Status,Seats,Fare',
                    scheduled.rides.map((r) => [r.riderName, r.riderEmail, r.pickup, r.dropoff,
                      new Date(r.departureTime).toLocaleString(), r.role, r.status, r.seats, r.price ?? '']),
                  )}>
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.csvText}>Download scheduled rides CSV</Text>
                </TouchableOpacity>
              </View>
            )}
```

(h) Add styles to the `StyleSheet.create`:
```js
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  segBtnOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  segText: { color: colors.textSubtle, fontWeight: '700' },
  segTextOn: { color: colors.primary },
  csvBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  csvText: { color: colors.primary, fontWeight: '700' },
```

- [ ] **Step 5: Update `ListEmptyComponent` for the reports view**

Change `ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}` to:
```jsx
        ListEmptyComponent={<Text style={styles.empty}>{view === 'users' ? 'No users found.' : 'No scheduled rides.'}</Text>}
```

- [ ] **Step 6: Manual verification (Expo)**

Run `cd mobile && npm start`, log in as admin → Admin tab. Expected: a Users | Reports toggle. Reports shows summary cards (Rides searched / Scheduled rides / Matched), a scrollable scheduled-ride list, and a **Download scheduled rides CSV** button that opens the native share sheet with a valid CSV.

- [ ] **Step 7: Commit + push Phase 2**

```bash
git add mobile/package.json mobile/package-lock.json mobile/src/services/adminService.js mobile/src/utils/csv.js mobile/src/screens/Admin/AdminScreen.js
git commit -m "feat(mobile-admin): reports view with searches/scheduled stats and CSV share export"
git push origin main
```

---

## Phase 3 — Google-Maps-style map (mobile only)

### Task 3.1: Restyle the Leaflet WebView (tiles, pins, route, tap-to-drop)

**Files:**
- Modify: `mobile/src/components/map/LeafletMap.js`

**Interfaces:**
- Consumes: existing props `routes, selected, origin, destination, user, fitToken, centerToken, follow, onSelectRoute`.
- Produces: new prop `onMapTap(latlng)` (`{lat,lng}`); message type `mapTap`. Existing `routeTap` behavior preserved.

- [ ] **Step 1: Swap tiles to a light Google-like basemap**

In `LeafletMap.js`, in the `HTML` string, replace the `L.tileLayer(...)` line with:

```js
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,attribution:'(c) OpenStreetMap, (c) CARTO'}).addTo(map);
```

Also change the `<style>` background and body bg from dark to light: `html,body,#map{height:100%;margin:0;background:#e8eaed}`.

- [ ] **Step 2: Replace markers with Google-style teardrop pins + accuracy halo**

In the `window.AUMO.update` function, replace the three marker lines (origin/destination/user `circleMarker`) with:

```js
  function pin(color){ return L.divIcon({className:'',iconSize:[26,38],iconAnchor:[13,38],
    html:'<svg width="26" height="38" viewBox="0 0 26 38"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="'+color+'"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>'}); }
  if(d.origin) markerLayer.addLayer(L.marker([d.origin.lat,d.origin.lng],{icon:pin('#1a73e8')}));
  if(d.destination) markerLayer.addLayer(L.marker([d.destination.lat,d.destination.lng],{icon:pin('#ea4335')}));
  if(d.user){
    markerLayer.addLayer(L.circleMarker([d.user.lat,d.user.lng],{radius:30,stroke:false,fillColor:'#4285F4',fillOpacity:0.15}));
    markerLayer.addLayer(L.circleMarker([d.user.lat,d.user.lng],{radius:7,color:'#fff',weight:3,fillColor:'#4285F4',fillOpacity:1}));
  }
```

- [ ] **Step 3: Draw two-tone (casing + core) route polylines**

Replace the `(d.routes||[]).forEach(...)` block with:

```js
  (d.routes||[]).forEach(function(r){
    if(!r.coords||r.coords.length<2)return;
    if(r.selected){
      routeLayer.addLayer(L.polyline(r.coords,{color:'#1967d2',weight:9,opacity:0.95}));
      var core=L.polyline(r.coords,{color:'#4285F4',weight:6,opacity:1});
      core.on('click',function(){ send({type:'routeTap',index:r.index}); });
      routeLayer.addLayer(core);
    } else {
      var alt=L.polyline(r.coords,{color:'#9aa0a6',weight:4,opacity:0.7,dashArray:'6,8'});
      alt.on('click',function(){ send({type:'routeTap',index:r.index}); });
      routeLayer.addLayer(alt);
    }
  });
```

- [ ] **Step 4: Emit map taps**

After the line `var map=L.map(...).setView(...)`, add:

```js
map.on('click',function(e){ send({type:'mapTap',lat:e.latlng.lat,lng:e.latlng.lng}); });
```

- [ ] **Step 5: Wire the new prop in the React component**

In the `LeafletMap` component signature add `onMapTap`, and in `onMessage` add a branch:

```js
      else if (m.type === 'mapTap') onMapTap?.({ lat: m.lat, lng: m.lng });
```

- [ ] **Step 6: Manual verification (Expo)**

Run `cd mobile && npm start`, open the Map tab. Expected: light Google-style basemap; teardrop pins for From/To; calculated route shows a blue line with a darker casing and grey dashed alternates; tapping the map fires `mapTap` (verify via a temporary `console.log` in `onMapTap` or wait for Task 3.2 wiring). Trip tracking (Start) still pans to the blue dot.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/map/LeafletMap.js
git commit -m "feat(mobile-map): google-maps-style tiles, teardrop pins, two-tone route, tap-to-drop event"
```

### Task 3.2: Map screen — bottom sheet, top search bar, no overlap

**Files:**
- Create: `mobile/src/components/map/MapBottomSheet.js`
- Modify: `mobile/src/screens/Map/MapScreen.js`

**Interfaces:**
- Consumes: `MapBottomSheet` (children + `collapsedHeight` prop), `useSafeAreaInsets`, `onMapTap` from Task 3.1.
- Produces: a layout where search/route/trip controls live in a single bottom sheet anchored to insets + tab bar; recenter FAB positioned relative to the sheet.

- [ ] **Step 1: Create a dependency-free two-snap bottom sheet**

Create `mobile/src/components/map/MapBottomSheet.js`:

```js
import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/theme';

const SCREEN_H = Dimensions.get('window').height;

// Simple two-snap sheet (collapsed shows the header; expanded shows content).
// Avoids extra native deps — drag the handle to toggle.
const MapBottomSheet = ({ collapsedHeight = 150, expandedHeight = SCREEN_H * 0.62, children }) => {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(true);
  const height = useRef(new Animated.Value(expandedHeight)).current;

  const snap = (toExpanded) => {
    setExpanded(toExpanded);
    Animated.spring(height, { toValue: toExpanded ? expandedHeight : collapsedHeight, useNativeDriver: false, bounciness: 4 }).start();
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderRelease: (_, g) => { if (g.dy > 30) snap(false); else if (g.dy < -30) snap(true); },
  })).current;

  return (
    <Animated.View style={[styles.sheet, { height, paddingBottom: insets.bottom + 64 }]}>
      <View {...pan.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg,
  },
  handleArea: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
});

export default MapBottomSheet;
```

- [ ] **Step 2: Import the sheet + safe-area inset in MapScreen**

In `MapScreen.js` imports, add:

```js
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapBottomSheet from '../../components/map/MapBottomSheet';
```

- [ ] **Step 3: Add a tap-to-drop handler**

In the `MapScreen` component body, add:

```js
  const insets = useSafeAreaInsets();

  const onMapTap = useCallback(async (latlng) => {
    try {
      const place = await locationService.reverseGeocode(latlng.lat, latlng.lng);
      const point = { lat: latlng.lat, lng: latlng.lng, address: place?.address || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` };
      if (!origin) setOrigin(point); else setDestination(point);
    } catch (_) {
      const point = { lat: latlng.lat, lng: latlng.lng, address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` };
      if (!origin) setOrigin(point); else setDestination(point);
    }
  }, [origin]);
```

Verify `locationService.reverseGeocode` exists:
```bash
grep -n "reverseGeocode\|reverse" mobile/src/services/locationService.js mobile/src/services/mapService.js
```
If the method is named differently (e.g. `mapService.reverseGeocode`), import and use that instead. If neither exists, fall back to the coordinate-only `point` (drop the try/await and just set the coord point).

- [ ] **Step 4: Pass `onMapTap` to the map**

In the `<LeafletMap ... />` usage, add the prop `onMapTap={onMapTap}`.

- [ ] **Step 5: Move controls into the bottom sheet and add the top search pill**

Replace the JSX from the `{/* Search / controls card */}` panel through the closing of the trip bar with a single bottom sheet. Specifically, remove the `styles.panel` card, the standalone route `cards` ScrollView, and the `tripBar` View, and render them inside `<MapBottomSheet>`:

```jsx
        {/* Top search pill */}
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color={colors.textSubtle} />
            <Text style={styles.searchPillText} numberOfLines={1}>
              {origin && destination ? `${origin.address?.split(',')[0]} → ${destination.address?.split(',')[0]}` : 'Search or tap the map'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.fab, { bottom: 150 + insets.bottom + 76 }]} onPress={recenter}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>

        <MapBottomSheet collapsedHeight={150}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <LocationSearchInput label="From" placeholder="Origin" value={origin?.address} dotColor={colors.primary} onSelect={setOrigin} />
            <LocationSearchInput label="To" placeholder="Destination" value={destination?.address} dotColor={colors.danger} onSelect={setDestination} />
            <View style={styles.modes}>
              {[{ k: 'carbon', label: '🍃 Eco' }, { k: 'time', label: '⚡ Fastest' }].map((m) => (
                <TouchableOpacity key={m.k} style={[styles.mode, optimizeFor === m.k && styles.modeOn]} onPress={() => setOptimizeFor(m.k)}>
                  <Text style={[styles.modeText, optimizeFor === m.k && styles.modeTextOn]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
              {loading ? <ActivityIndicator color="#04210f" /> : <Text style={styles.calcText}>Find route</Text>}
            </TouchableOpacity>

            {routes.length > 0 && (
              <View style={styles.routeList}>
                {routes.map((r, i) => (
                  <TouchableOpacity key={i} style={[styles.routeRow, i === selected && styles.routeRowOn]} onPress={() => selectRoute(i)}>
                    <Text style={styles.routeName}>{r.label || (r.profile === 'time' ? 'Fastest' : r.profile === 'carbon' ? 'Eco' : `Route ${i + 1}`)}</Text>
                    <Text style={styles.routeMeta}>🕑 {formatDuration(r.total_time_minutes)} · 📏 {formatDistance(r.total_distance_km)} · {formatEmission(r.total_emissions_g)} CO₂</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.tripRow}>
                  {trip && progress ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripText}>{progress.remainingKm?.toFixed(1)} km left{etaMin != null ? ` · ~${etaMin} min` : ''}</Text>
                      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress.progressPercent || 0}%` }]} /></View>
                    </View>
                  ) : (
                    <Text style={styles.tripText}>{routes[selected]?.label || 'Route ready'} · tap Start to track</Text>
                  )}
                  <TouchableOpacity style={[styles.tripBtn, trip && styles.tripBtnStop]} onPress={trip ? stopTrip : startTrip}>
                    <Text style={styles.tripBtnText}>{trip ? '⏹ Stop' : '▶ Start'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </MapBottomSheet>
```

- [ ] **Step 6: Update styles**

In `MapScreen.js` `StyleSheet.create`, remove `panel`, `card`, `cards`, `routeCard`, `routeCardOn`, `tripBar`; and add:

```js
  topBar: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  searchPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  searchPillText: { color: colors.text, flex: 1 },
  routeList: { marginTop: spacing.md, gap: 8 },
  routeRow: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  routeRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.sm },
```

(Keep existing `modes/mode/modeOn/modeText/modeTextOn/calcBtn/calcText/fab/routeName/routeMeta/tripText/barTrack/barFill/tripBtn/tripBtnStop/tripBtnText`.)

- [ ] **Step 7: Manual verification (Expo, small screen)**

Run `cd mobile && npm start`. On the Map tab and a small device/emulator (360×640): the top search pill sits below the notch; all controls live in a draggable bottom sheet that does not overlap the recenter FAB or the tab bar; dragging the handle collapses/expands; calculating routes lists them in the sheet; Start/Stop tracking works; tapping the map drops a pin and reverse-geocodes.

- [ ] **Step 8: Commit + push Phase 3**

```bash
git add mobile/src/components/map/MapBottomSheet.js mobile/src/screens/Map/MapScreen.js
git commit -m "feat(mobile-map): bottom-sheet layout, top search pill, tap-to-drop; fixes control overlap"
git push origin main
```

---

## Phase 4 — Cab-booking interface (mobile carpool only)

### Task 4.1: Client-side fare & ETA helpers

**Files:**
- Modify: `mobile/src/utils/helpers.js` (add `estimateEtaMinutes`, `estimateFare`)

**Interfaces:**
- Consumes: existing `haversineKm(a, b)` in `helpers.js`.
- Produces: `estimateEtaMinutes(pickup, dropoff) -> number`, `estimateFare(pickup, dropoff) -> number` (INR, ₹4/km).

- [ ] **Step 1: Confirm `haversineKm` signature**

Run:
```bash
grep -n "haversineKm" mobile/src/utils/helpers.js
```
Expected: `export const haversineKm = (a, b) => ...` taking `{lat,lng}` points (it's already used by `ScheduleRide`).

- [ ] **Step 2: Add the helpers**

Append to `mobile/src/utils/helpers.js`:

```js
// Cab-style client estimates. ETA assumes ~28 km/h urban average; fare uses the
// same ₹4/km convention as ScheduleRide. Both are estimates only — when a driver
// has set a price, prefer that actual fare in the UI.
export const estimateEtaMinutes = (pickup, dropoff) => {
  if (!pickup || !dropoff) return null;
  const km = haversineKm(pickup, dropoff);
  return Math.max(2, Math.round((km / 28) * 60));
};

export const estimateFare = (pickup, dropoff) => {
  if (!pickup || !dropoff) return null;
  return Math.round(haversineKm(pickup, dropoff) * 4);
};
```

- [ ] **Step 3: Manual verification**

Add a temporary log in `ScheduleRide` or use a node REPL with two Mumbai points (~10 km apart). Expected: `estimateFare` ≈ ₹40, `estimateEtaMinutes` ≈ 21 min. Remove the temporary log.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/utils/helpers.js
git commit -m "feat(mobile): client-side fare and ETA estimate helpers"
```

### Task 4.2: Cab-style ride cards + booking sheet in FindRides

**Files:**
- Create: `mobile/src/components/carpool/BookingSheet.js`
- Modify: `mobile/src/screens/Carpool/FindRides.js`

**Interfaces:**
- Consumes: `estimateEtaMinutes`, `estimateFare` (Task 4.1); existing `carpoolService.createRequest` and the `onOpenChat` prop.
- Produces: `BookingSheet` modal component; `FindRides` cards with fare/ETA chips and a Book action.

- [ ] **Step 1: Create the BookingSheet**

Create `mobile/src/components/carpool/BookingSheet.js`:

```js
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError, estimateEtaMinutes, estimateFare } from '../../utils/helpers';

// Cab-style confirmation sheet. Books a seat by creating a passenger request on
// the same route (existing endpoint) — no new backend flow.
const BookingSheet = ({ ride, visible, onClose, onBooked, onMessage }) => {
  const [loading, setLoading] = useState(false);
  if (!ride) return null;

  const eta = estimateEtaMinutes(ride.pickup, ride.dropoff);
  const fare = ride.price != null ? ride.price : estimateFare(ride.pickup, ride.dropoff);

  const book = async () => {
    setLoading(true);
    try {
      await carpoolService.createRequest({
        pickup: { lat: ride.pickup.lat, lng: ride.pickup.lng, address: ride.pickup.address || '' },
        dropoff: { lat: ride.dropoff.lat, lng: ride.dropoff.lng, address: ride.dropoff.address || '' },
        departureTime: ride.departureTime,
        role: 'passenger',
        seatsNeeded: 1,
        vehicleType: ride.vehicleType || 'car',
        price: ride.price ?? null,
      });
      Alert.alert('Seat requested 🚗', 'Your booking request was sent. Coordinate with the driver in chat.', [
        { text: 'Open chat', onPress: () => { onClose?.(); onMessage?.(ride); } },
        { text: 'OK', onPress: () => { onClose?.(); onBooked?.(); } },
      ]);
    } catch (e) {
      Alert.alert('Could not book', apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Confirm booking</Text>
          <View style={styles.leg}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.legText} numberOfLines={1}>{ride.pickup?.address || 'Pickup'}</Text></View>
          <View style={styles.leg}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.legText} numberOfLines={1}>{ride.dropoff?.address || 'Drop-off'}</Text></View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="cash-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>₹{fare}{ride.price == null ? ' est.' : ''}</Text></View>
            <View style={styles.metaChip}><Ionicons name="time-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>~{eta} min</Text></View>
            <View style={styles.metaChip}><Ionicons name="people-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>{ride.seatsAvailable} left</Text></View>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={loading}>
            <Text style={styles.bookText}>{loading ? 'Booking…' : 'Book this ride'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 6 },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legText: { color: colors.textMuted, flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  bookBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  bookText: { color: '#04210f', fontWeight: '800', fontSize: font.body },
  ghostBtn: { alignItems: 'center', paddingVertical: 10 },
  ghostText: { color: colors.textSubtle, fontWeight: '700' },
});

export default BookingSheet;
```

- [ ] **Step 2: Add fare/ETA chips + Book button to FindRides cards**

In `FindRides.js`:

(a) Update imports:
```js
import { apiError, estimateEtaMinutes, estimateFare } from '../../utils/helpers';
import BookingSheet from '../../components/carpool/BookingSheet';
```

(b) Add booking state in the component:
```js
  const [booking, setBooking] = useState(null); // ride being booked
```

(c) In `renderItem`, after the `when` Text line, replace the single message button with a fare/ETA row + Book + Message:
```jsx
            <View style={styles.estRow}>
              <Text style={styles.estChip}>₹{item.price != null ? item.price : estimateFare(item.pickup, item.dropoff)}{item.price == null ? ' est' : ''}</Text>
              <Text style={styles.estChip}>~{estimateEtaMinutes(item.pickup, item.dropoff)} min</Text>
              {item.pickupDistanceKm != null && <Text style={styles.estChip}>{item.pickupDistanceKm} km away</Text>}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.bookBtn} onPress={() => setBooking(item)}>
                <Ionicons name="car-outline" size={16} color="#04210f" />
                <Text style={styles.bookText}>Book</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.msgBtn} onPress={() => onOpenChat?.(item)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                <Text style={styles.msgText}>Message</Text>
              </TouchableOpacity>
            </View>
```

(d) Render the sheet by wrapping the returned `FlatList` in a fragment and adding it after:
```jsx
      <BookingSheet
        ride={booking}
        visible={!!booking}
        onClose={() => setBooking(null)}
        onBooked={load}
        onMessage={onOpenChat}
      />
```
(Change the component `return (<FlatList .../>)` to `return (<><FlatList .../>{/* sheet */}</>)`.)

(e) Add styles:
```js
  estRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  estChip: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, fontSize: font.tiny, fontWeight: '700', overflow: 'hidden' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  bookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10 },
  bookText: { color: '#04210f', fontWeight: '800', fontSize: font.small },
```
(Keep existing `msgBtn`/`msgText`; remove `marginTop` from `msgBtn` if it now sits in `actionRow` — set `msgBtn` to `{ flex: 1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, borderWidth:1, borderColor: colors.border, borderRadius: radius.md, paddingVertical:10 }`.)

- [ ] **Step 3: Manual verification (Expo)**

Run `cd mobile && npm start`, Carpool → Find. Expected: each ride card shows fare + ETA + distance chips and a **Book** + **Message** pair. Tapping Book opens the booking sheet showing route, fare, ETA, seats; confirming creates a request and offers to open chat; pull-to-refresh reloads.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/carpool/BookingSheet.js mobile/src/screens/Carpool/FindRides.js
git commit -m "feat(mobile-carpool): cab-style ride cards with fare/ETA and booking sheet"
```

### Task 4.3: Ride status stepper + fare/ETA in details & schedule

**Files:**
- Create: `mobile/src/components/carpool/StatusStepper.js`
- Modify: `mobile/src/screens/Carpool/RideDetailsScreen.js`
- Modify: `mobile/src/screens/Carpool/ScheduleRide.js`

**Interfaces:**
- Consumes: `ride.status`; `estimateEtaMinutes`, `estimateFare`.
- Produces: presentational `StatusStepper({ status })`.

- [ ] **Step 1: Create the StatusStepper**

Create `mobile/src/components/carpool/StatusStepper.js`:

```js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../theme/theme';

// Presentational stepper mapped from the existing CarpoolRequest status. No new
// state — purely reflects ride.status.
const STEPS = ['pending', 'matched', 'completed'];
const LABELS = { pending: 'Requested', matched: 'Matched', completed: 'Completed' };

const StatusStepper = ({ status }) => {
  if (status === 'cancelled') {
    return <View style={styles.cancelled}><Text style={styles.cancelledText}>Cancelled</Text></View>;
  }
  const normalized = status === 'matching' ? 'pending' : status;
  const activeIdx = Math.max(0, STEPS.indexOf(normalized));
  return (
    <View style={styles.row}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={styles.step}>
            <View style={[styles.dot, i <= activeIdx && styles.dotOn]} />
            <Text style={[styles.label, i <= activeIdx && styles.labelOn]}>{LABELS[s]}</Text>
          </View>
          {i < STEPS.length - 1 && <View style={[styles.line, i < activeIdx && styles.lineOn]} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { alignItems: 'center', width: 80 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border, marginBottom: 4 },
  dotOn: { backgroundColor: colors.primary },
  label: { color: colors.textSubtle, fontSize: font.tiny },
  labelOn: { color: colors.primary, fontWeight: '700' },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 16 },
  lineOn: { backgroundColor: colors.primary },
  cancelled: { paddingVertical: 8, alignItems: 'center' },
  cancelledText: { color: colors.danger, fontWeight: '700' },
});

export default StatusStepper;
```

- [ ] **Step 2: Show the stepper + fare/ETA in RideDetailsScreen**

In `RideDetailsScreen.js`:

(a) Add imports:
```js
import StatusStepper from '../../components/carpool/StatusStepper';
import { apiError, estimateEtaMinutes, estimateFare } from '../../utils/helpers';
```
(replace the existing `import { apiError } ...` line).

(b) After the first leg `card` View (the pickup/drop card), add a stepper card:
```jsx
        <View style={styles.card}><StatusStepper status={ride.status} /></View>
```

(c) In the details card, after the Departs row, add an ETA + estimated-fare row when not set:
```jsx
          <Row icon="speedometer-outline" label="Est. time" value={`~${estimateEtaMinutes(ride.pickup, ride.dropoff)} min`} />
          {ride.price == null && <Row icon="cash-outline" label="Est. fare" value={`₹${estimateFare(ride.pickup, ride.dropoff)}`} />}
```

- [ ] **Step 3: Add a fare/ETA preview to ScheduleRide**

In `ScheduleRide.js`, add to imports: `estimateEtaMinutes, estimateFare` from helpers (extend the existing `import { apiError, haversineKm } ...`). Below the `suggested` useMemo, add a preview block just above the Schedule button:

```jsx
      {pickup && dropoff && (
        <View style={styles.preview}>
          <Text style={styles.previewText}>~{estimateEtaMinutes(pickup, dropoff)} min · ₹{estimateFare(pickup, dropoff)} est.</Text>
        </View>
      )}
```

Add style:
```js
  preview: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center' },
  previewText: { color: colors.primary, fontWeight: '700' },
```

- [ ] **Step 4: Manual verification (Expo)**

Run `cd mobile && npm start`. Carpool → History → a ride: the details show a status stepper (Requested→Matched→Completed, cancelled shown distinctly) and Est. time/fare rows. Schedule tab: picking pickup+dropoff shows an ETA/fare preview before submit.

- [ ] **Step 5: Commit + push Phase 4**

```bash
git add mobile/src/components/carpool/StatusStepper.js mobile/src/screens/Carpool/RideDetailsScreen.js mobile/src/screens/Carpool/ScheduleRide.js
git commit -m "feat(mobile-carpool): ride status stepper and fare/ETA in details and schedule"
git push origin main
```

---

## Phase 5 — Layout / overlap pass (whole mobile app)

### Task 5.1: Shared bottom-inset helper + carpool tab row

**Files:**
- Modify: `mobile/src/theme/theme.js` (add `TAB_BAR_HEIGHT` constant)
- Modify: `mobile/src/screens/Carpool/CarpoolScreen.js` (proper touchable tab pills)

**Interfaces:**
- Produces: `export const TAB_BAR_HEIGHT = 60;` reused by screens for bottom padding.

- [ ] **Step 1: Export the tab-bar height**

In `mobile/src/theme/theme.js`, add at the end:
```js
// Height of the bottom tab bar (see MainNavigator tabBarStyle.height) — screens
// add this (+ safe-area bottom inset) as content padding so nothing hides under it.
export const TAB_BAR_HEIGHT = 60;
```

- [ ] **Step 2: Convert the carpool tab row to touchable pills**

In `CarpoolScreen.js`, replace the `tabs` block (the `View style={styles.tabs}` mapping `Text` elements) with:
```jsx
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[styles.tab, tab === t.k && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t.k && styles.tabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
```
Add `TouchableOpacity` to the `react-native` import. Update styles:
```js
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.textSubtle, fontWeight: '700', fontSize: font.small },
  tabTextOn: { color: '#04210f' },
```
(Remove the old `tab`/`tabOn` text-based styles that used `overflow:'hidden'`.)

- [ ] **Step 3: Manual verification**

Run `cd mobile && npm start`. Carpool tabs are now properly-sized touchable pills with consistent height and no text clipping.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/theme/theme.js mobile/src/screens/Carpool/CarpoolScreen.js
git commit -m "refactor(mobile): tab-bar height constant and touchable carpool tab pills"
```

### Task 5.2: Clear the tab bar on all list/scroll screens

**Files:**
- Modify: `mobile/src/screens/Carpool/FindRides.js`, `mobile/src/screens/Carpool/RideHistory.js`, `mobile/src/screens/Admin/AdminScreen.js`, `mobile/src/screens/Dashboard/DashboardScreen.js`, `mobile/src/screens/Profile/ProfileScreen.js`

**Interfaces:**
- Consumes: `TAB_BAR_HEIGHT` (Task 5.1), `useSafeAreaInsets`.

- [ ] **Step 1: Add bottom padding to each scroll container**

For each file above, ensure the main `FlatList`/`ScrollView` `contentContainerStyle` includes bottom padding that clears the tab bar. Pattern (apply per file, merging with existing `contentContainerStyle`):

```js
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../theme/theme';
// inside component:
const insets = useSafeAreaInsets();
// contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg }}
```

Concretely:
- `FindRides.js`: change `contentContainerStyle={{ padding: spacing.lg, gap: 10 }}` → add `paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg`.
- `RideHistory.js`: same change to its `contentContainerStyle`.
- `AdminScreen.js`: same change to the `FlatList` `contentContainerStyle`.
- `DashboardScreen.js` / `ProfileScreen.js`: locate the root `ScrollView`/`FlatList` `contentContainerStyle` (`grep -n "contentContainerStyle" <file>`) and add the same `paddingBottom`. If a screen has no scroll container, wrap its content in a `ScrollView` with that `contentContainerStyle`.

- [ ] **Step 2: Manual verification (small screen)**

Run `cd mobile && npm start`. On a 360×640 emulator, scroll each tab to the bottom: the last item is fully visible above the tab bar (not clipped) on Find, History, Admin, Dashboard, Profile.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/Carpool/FindRides.js mobile/src/screens/Carpool/RideHistory.js mobile/src/screens/Admin/AdminScreen.js mobile/src/screens/Dashboard/DashboardScreen.js mobile/src/screens/Profile/ProfileScreen.js
git commit -m "fix(mobile): clear bottom tab bar on all scrollable screens"
```

### Task 5.3: Final overlap sweep + push

**Files:**
- Modify: any screen found with remaining overlap (verification-driven)

- [ ] **Step 1: Visual sweep**

Run `cd mobile && npm start`. Walk every tab on a small emulator (360×640) and a large one (430×932). For each, confirm: no two components overlap, no control sits under the tab bar or notch, cards have consistent padding, text is not clipped.

- [ ] **Step 2: Fix any stragglers**

For each issue found, apply the same patterns already used: move floating controls to inset-aware positions, add `paddingBottom`, or use `numberOfLines`. Keep changes minimal and theme-token-based.

- [ ] **Step 3: Commit + push Phase 5**

```bash
git add -A mobile/src
git commit -m "fix(mobile): final layout/overlap sweep across screens"
git push origin main
```

---

## Self-Review (completed against the spec)

- **WS1 Map (mobile):** Task 3.1 (tiles/pins/route/tap) + Task 3.2 (bottom sheet/search pill/overlap fix). ✔
- **WS2 Cab interface (mobile):** Task 4.1 (fare/ETA) + 4.2 (cards/booking sheet) + 4.3 (stepper, details, schedule). Existing endpoints only, no backend flow. ✔
- **WS3 Layout/overlap:** Task 3.2 (map) + 5.1/5.2/5.3 (tab pills, inset padding, sweep). ✔
- **WS4 Delete rule (6h, both roles):** Task 1.1 (backend, authoritative) + 1.2 (mobile UI). Web inherits via server check. ✔
- **WS5 Admin reports + CSV (mobile + web):** Task 2.1 (endpoints from `Ride`/`CarpoolRequest`) + 2.2 (web) + 2.3 (mobile share-sheet CSV). No `SearchLog` (corrected). ✔
- **Constraints:** no API keys, no map SDK, mobile-only map, no Claude attribution, push per phase — all reflected in steps. ✔
- **Placeholder scan:** every code step contains concrete code; verification steps have exact commands/expected output. ✔
- **Type/name consistency:** `exportCsv(filename, header, rows)` (mobile) vs `downloadCsv(filename, header, rows)` (web) — intentionally distinct names per platform; report method names (`getReports`/`getSearchesReport`/`getScheduledReport`) consistent across mobile & web services; endpoint paths consistent between Task 2.1 and consumers. ✔
