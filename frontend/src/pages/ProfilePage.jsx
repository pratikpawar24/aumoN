import React, { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { User, Save, Leaf } from 'lucide-react';
import { VEHICLE_TYPES } from '../utils/constants';
import { Spinner }  from '../components/Common/Loading';
import toast        from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name:        user?.name || '',
    vehicleType: user?.vehicleType || 'car',
    preferences: {
      optimizeFor: user?.preferences?.optimizeFor || 'carbon',
    },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(form);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4"
         style={{ background: '#0f172a' }}>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-green-400" />
          My Profile
        </h1>

        {/* Avatar & green score */}
        <div className="rounded-2xl p-6 border border-white/10 text-center"
             style={{ background: 'rgba(30,41,59,0.8)' }}>
          <div className="w-20 h-20 rounded-2xl mx-auto mb-3
                          flex items-center justify-center
                          text-green-400 text-3xl font-bold"
               style={{ background: 'rgba(34,197,94,0.2)' }}>
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-white">{user.name}</h2>
          <p className="text-slate-400 text-sm">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Leaf className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold">
              Green Score: {user.greenScore}/100
            </span>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave}
              className="rounded-2xl p-6 border border-white/10 space-y-4"
              style={{ background: 'rgba(30,41,59,0.8)' }}>
          <h3 className="font-semibold text-white">Edit Profile</h3>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Display Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 text-sm text-white
                         border border-white/10 focus:border-green-500/50
                         focus:outline-none"
              style={{ background: 'rgba(15,23,42,0.8)' }}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              Primary Vehicle
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, vehicleType: v.value }))}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl
                              border text-xs transition-all
                              ${form.vehicleType === v.value
                                ? 'border-green-500 text-green-400'
                                : 'border-white/10 text-slate-400'}`}
                  style={form.vehicleType === v.value
                    ? { background: 'rgba(34,197,94,0.2)' }
                    : { background: 'rgba(15,23,42,0.8)' }}
                >
                  <span className="text-base">{v.icon}</span>
                  {v.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Default Optimization
            </label>
            <select
              value={form.preferences.optimizeFor}
              onChange={(e) => setForm((p) => ({
                ...p,
                preferences: { ...p.preferences, optimizeFor: e.target.value },
              }))}
              className="w-full rounded-xl px-4 py-3 text-sm text-white
                         border border-white/10 focus:border-green-500/50
                         focus:outline-none"
              style={{ background: 'rgba(15,23,42,0.8)' }}
            >
              <option value="carbon">🌿 Eco Route</option>
              <option value="time">⚡ Fastest</option>
              <option value="distance">📏 Shortest</option>
              <option value="balanced">⚖️ Balanced</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-green-500 hover:bg-green-600
                       disabled:opacity-50 text-white font-semibold rounded-xl
                       transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <><Spinner size="sm" color="white" />Saving...</>
              : <><Save className="w-4 h-4" />Save Changes</>}
          </button>
        </form>

        {/* Stats summary */}
        <div className="rounded-2xl p-6 border border-white/10"
             style={{ background: 'rgba(30,41,59,0.8)' }}>
          <h3 className="font-semibold text-white mb-4">My Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Trips',
                val: user.totalTrips || 0 },
              { label: 'Carpools Joined',
                val: user.carpoolsJoined || 0 },
              { label: 'CO₂ Saved',
                val: `${Math.round((user.totalCO2Saved || 0) / 1000)}kg` },
              { label: 'Distance',
                val: `${Math.round(user.totalDistanceKm || 0)}km` },
            ].map(({ label, val }) => (
              <div key={label}
                   className="rounded-xl p-3 text-center"
                   style={{ background: 'rgba(15,23,42,0.8)' }}>
                <p className="text-lg font-bold text-green-400">{val}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;