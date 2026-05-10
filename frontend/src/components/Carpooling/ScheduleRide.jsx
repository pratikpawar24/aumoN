import React, { useMemo, useState } from 'react';
import SearchBox    from '../Map/SearchBox';
import { Spinner }  from '../Common/Loading';
import { useCarpool } from '../../hooks/useCarpool';
import { VEHICLE_TYPES } from '../../utils/constants';
import { Users, Clock, Settings, IndianRupee } from 'lucide-react';
import { haversineDistance } from '../../utils/helpers';

// Quick-and-dirty fare suggestion: ₹4/km for car, ₹2/km for motorcycle, free for bike/walk.
const suggestPrice = (pickup, dropoff, vehicleType, role) => {
  if (role !== 'driver' || !pickup || !dropoff) return null;
  const km = haversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const rate = { car: 4, electric: 3, motorcycle: 2 }[vehicleType] || 4;
  return Math.round(km * rate);
};

const ScheduleRide = ({ onSuccess }) => {
  const { createRequest, loading } = useCarpool();

  const [form, setForm] = useState({
    pickup: null,
    dropoff: null,
    departureTime: '',
    timeWindowMinutes: 30,
    maxDetourMinutes: 10,
    seatsNeeded: 1,
    seatsAvailable: 1,
    role: 'passenger',
    vehicleType: 'car',
    price: '',
    notes: '',
    preferences: { genderPreference: 'any', maxWalkDistanceM: 500 },
  });
  const [showPrefs, setShowPrefs] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const updatePref = (k, v) =>
    setForm((p) => ({ ...p, preferences: { ...p.preferences, [k]: v } }));

  const suggested = useMemo(
    () => suggestPrice(form.pickup, form.dropoff, form.vehicleType, form.role),
    [form.pickup, form.dropoff, form.vehicleType, form.role]
  );

  const isValid = form.pickup && form.dropoff && form.departureTime;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    const payload = {
      ...form,
      departureTime: new Date(form.departureTime).toISOString(),
      price: form.price === '' ? null : Number(form.price),
    };
    const result = await createRequest(payload);
    if (result) onSuccess?.(result);
  };

  return (
    <form onSubmit={handleSubmit}
          className="rounded-xl border aumo-border p-5 space-y-4 aumo-bg-surface">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold aumo-text-primary">Schedule a Ride</h3>
      </div>

      <SearchBox
        label="Pickup"
        placeholder="Where do you start?"
        onSelect={(loc) => update('pickup', loc)}
        value={form.pickup?.address || ''}
      />

      <SearchBox
        label="Drop-off"
        placeholder="Where are you going?"
        onSelect={(loc) => update('dropoff', loc)}
        value={form.dropoff?.address || ''}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs aumo-text-subtle mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />Departure Time
          </label>
          <input
            type="datetime-local"
            value={form.departureTime}
            onChange={(e) => update('departureTime', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
            className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                       aumo-bg-input border aumo-border focus:border-green-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs aumo-text-subtle mb-1 block">Role</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                       aumo-bg-input border aumo-border focus:outline-none"
          >
            <option value="passenger">Passenger</option>
            <option value="driver">Driver (offering seats)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {form.role === 'driver' ? (
          <div>
            <label className="text-xs aumo-text-subtle mb-1 block">Seats Available</label>
            <select
              value={form.seatsAvailable}
              onChange={(e) => update('seatsAvailable', +e.target.value)}
              className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                         aumo-bg-input border aumo-border focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs aumo-text-subtle mb-1 block">Seats Needed</label>
            <select
              value={form.seatsNeeded}
              onChange={(e) => update('seatsNeeded', +e.target.value)}
              className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                         aumo-bg-input border aumo-border focus:outline-none"
            >
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs aumo-text-subtle mb-1 block">Time Window</label>
          <select value={form.timeWindowMinutes}
                  onChange={(e) => update('timeWindowMinutes', +e.target.value)}
                  className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                             aumo-bg-input border aumo-border focus:outline-none">
            {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m}m</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs aumo-text-subtle mb-1 block">Max Detour</label>
          <select value={form.maxDetourMinutes}
                  onChange={(e) => update('maxDetourMinutes', +e.target.value)}
                  className="w-full rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                             aumo-bg-input border aumo-border focus:outline-none">
            {[5, 10, 15, 20].map((m) => <option key={m} value={m}>{m}m</option>)}
          </select>
        </div>
      </div>

      {/* Price (drivers offer; passengers can name a max) */}
      <div>
        <label className="text-xs aumo-text-subtle mb-1 block flex items-center gap-1">
          <IndianRupee className="w-3 h-3" />
          {form.role === 'driver' ? 'Fare per seat' : 'Max fare you\'d pay'}
          <span className="aumo-text-subtle ml-1">(optional)</span>
          {suggested != null && (
            <button type="button"
                    onClick={() => update('price', suggested)}
                    className="ml-auto text-green-500 hover:text-green-600">
              Suggest ₹{suggested}
            </button>
          )}
        </label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aumo-text-subtle" />
          <input
            type="number"
            min="0"
            step="10"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            placeholder="Leave blank to negotiate in chat"
            className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-xl text-sm aumo-text-primary
                       aumo-bg-input border aumo-border focus:border-green-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs aumo-text-subtle mb-1 block">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Anything other riders should know — luggage, pets, AC, etc."
          className="w-full rounded-xl px-3 py-2.5 text-sm aumo-text-primary
                     aumo-bg-input border aumo-border focus:border-green-500/50 focus:outline-none"
        />
      </div>

      {form.role === 'driver' && (
        <div>
          <label className="text-xs aumo-text-subtle mb-2 block">Vehicle Type</label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_TYPES.filter((v) => ['car', 'electric', 'motorcycle'].includes(v.value)).map((v) => (
              <button type="button" key={v.value}
                      onClick={() => update('vehicleType', v.value)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] rounded-xl
                                  border text-xs transition-all
                                  ${form.vehicleType === v.value
                                    ? 'bg-green-500/20 border-green-500 text-green-500'
                                    : 'aumo-border aumo-text-subtle'}`}>
                {v.icon} {v.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setShowPrefs((p) => !p)}
              className="flex items-center gap-2 text-xs aumo-text-subtle hover:aumo-text-primary">
        <Settings className="w-3 h-3" />
        Preferences {showPrefs ? '▲' : '▼'}
      </button>

      {showPrefs && (
        <div className="space-y-3 pl-3 border-l-2 aumo-border animate-fade-in">
          <div>
            <label className="text-xs aumo-text-subtle mb-1 block">Gender Preference</label>
            <select value={form.preferences.genderPreference}
                    onChange={(e) => updatePref('genderPreference', e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm aumo-text-primary
                               aumo-bg-input border aumo-border focus:outline-none">
              <option value="any">Any</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>
          </div>
        </div>
      )}

      <button type="submit" disabled={!isValid || loading}
              className="w-full py-3 min-h-[48px] bg-green-500 hover:bg-green-600
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold rounded-xl transition-all
                         flex items-center justify-center gap-2">
        {loading ? <><Spinner size="sm" color="white" />Submitting...</> : '🚗 Schedule Ride'}
      </button>
    </form>
  );
};

export default ScheduleRide;
