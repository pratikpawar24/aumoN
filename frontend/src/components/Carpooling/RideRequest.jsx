import React, { useState } from 'react';
import SearchBox   from '../Map/SearchBox';
import { useCarpool } from '../../hooks/useCarpool';
import { VEHICLE_TYPES } from '../../utils/constants';
import { Spinner } from '../Common/Loading';
import { Users, Clock, Settings } from 'lucide-react';

const RideRequest = ({ onSuccess }) => {
  const { createRequest, loading } = useCarpool();
  const [form, setForm] = useState({
    pickup:              null,
    dropoff:             null,
    departureTime:       '',
    timeWindowMinutes:   30,
    maxDetourMinutes:    10,
    seatsNeeded:         1,
    role:                'passenger',
    vehicleType:         'car',
    preferences: {
      genderPreference: 'any',
      maxWalkDistanceM: 500,
    },
  });
  const [showPrefs, setShowPrefs] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pickup || !form.dropoff || !form.departureTime) return;

    const result = await createRequest({
      ...form,
      departureTime: new Date(form.departureTime).toISOString(),
    });

    if (result) onSuccess && onSuccess(result);
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const updatePref = (key, val) =>
    setForm((p) => ({ ...p, preferences: { ...p.preferences, [key]: val } }));

  const isValid = form.pickup && form.dropoff && form.departureTime;

  return (
    <form onSubmit={handleSubmit}
          className="glass rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-white">New Carpool Request</h3>
      </div>

      <SearchBox
        label="Pickup Location"
        placeholder="Where do you need to be picked up?"
        onSelect={(loc) => update('pickup', loc)}
        value={form.pickup?.address || ''}
      />

      <SearchBox
        label="Drop-off Location"
        placeholder="Where are you going?"
        onSelect={(loc) => update('dropoff', loc)}
        value={form.dropoff?.address || ''}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
            <Clock className="w-3 h-3" />Departure Time
          </label>
          <input
            type="datetime-local"
            value={form.departureTime}
            onChange={(e) => update('departureTime', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
            className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white
                       border border-white/10 focus:border-primary-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Role</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white
                       border border-white/10 focus:border-primary-500/50 focus:outline-none
                       bg-transparent"
          >
            <option value="passenger">Passenger</option>
            <option value="driver">Driver</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Seats Needed</label>
          <select value={form.seatsNeeded} onChange={(e) => update('seatsNeeded', +e.target.value)}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white
                             border border-white/10 focus:outline-none bg-transparent">
            {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Time Window</label>
          <select value={form.timeWindowMinutes}
                  onChange={(e) => update('timeWindowMinutes', +e.target.value)}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white
                             border border-white/10 focus:outline-none bg-transparent">
            {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m}m</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Max Detour</label>
          <select value={form.maxDetourMinutes}
                  onChange={(e) => update('maxDetourMinutes', +e.target.value)}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white
                             border border-white/10 focus:outline-none bg-transparent">
            {[5, 10, 15, 20].map(m => <option key={m} value={m}>{m}m</option>)}
          </select>
        </div>
      </div>

      {/* Vehicle type (drivers only) */}
      {form.role === 'driver' && (
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Vehicle Type</label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_TYPES.filter(v => ['car','electric','motorcycle'].includes(v.value))
              .map((v) => (
                <button type="button" key={v.value}
                        onClick={() => update('vehicleType', v.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl
                                    border text-xs transition-all
                                    ${form.vehicleType === v.value
                                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                      : 'glass border-white/10 text-slate-400'}`}>
                  {v.icon} {v.label.split(' ')[0]}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Preferences toggle */}
      <button type="button" onClick={() => setShowPrefs(p => !p)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
        <Settings className="w-3 h-3" />
        Preferences {showPrefs ? '▲' : '▼'}
      </button>

      {showPrefs && (
        <div className="space-y-3 pl-3 border-l-2 border-white/10 animate-fade-in">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Gender Preference</label>
            <select value={form.preferences.genderPreference}
                    onChange={(e) => updatePref('genderPreference', e.target.value)}
                    className="w-full glass rounded-xl px-3 py-2 text-sm text-white
                               border border-white/10 focus:outline-none bg-transparent">
              <option value="any">Any</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>
          </div>
        </div>
      )}

      <button type="submit" disabled={!isValid || loading}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold rounded-xl transition-all
                         flex items-center justify-center gap-2">
        {loading ? <><Spinner size="sm" color="white" />Submitting...</> : '🚗 Submit Request'}
      </button>
    </form>
  );
};

export default RideRequest;