import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { Users, ShieldOff, Mail, Activity, Leaf, Car } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => (
  <div className="rounded-xl p-4 border"
       style={{
         background: 'rgba(255,255,255,0.03)',
         borderColor: `rgba(99,102,241,0.20)`,
       }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <Icon className={`w-4 h-4 text-${color}-400`} />
    </div>
    <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [s, a] = await Promise.all([
        adminService.getStats(),
        adminService.activeRides(),
      ]);
      setStats(s.stats);
      setTrips(a.trips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll active trips every 10s — fits the spec ("real-time active rides counter").
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Live snapshot of the AumoN network.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users}    label="Users"     value={stats?.users.total} sub={`${stats?.users.verified} verified`} />
        <StatCard icon={ShieldOff} label="Blocked"  value={stats?.users.blocked} color="red" />
        <StatCard icon={Mail}     label="Unverified" value={(stats?.users.total || 0) - (stats?.users.verified || 0)} />
        <StatCard icon={Activity} label="Active trips" value={stats?.rides.activeTrips} color="green" />
        <StatCard icon={Car}      label="Rides today"  value={stats?.rides.today} />
        <StatCard icon={Leaf}     label="CO₂ saved (30d)"
                  value={`${Math.round((stats?.emissions.co2SavedG_30d || 0) / 1000)} kg`}
                  color="green" />
      </div>

      <div className="rounded-xl border border-indigo-500/20 p-4"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Active trips</h2>
          <span className="text-xs text-slate-500">Live · refreshes every 10s</span>
        </div>
        {trips.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No trips in progress right now.</p>
        ) : (
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t._id}
                   className="flex items-center justify-between gap-3 p-3 rounded-lg
                              border border-white/5"
                   style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {t.userId?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {t.origin?.address?.split(',')[0] || 'origin'} → {t.destination?.address?.split(',')[0] || 'destination'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-400">{Math.round((t.distanceTraveledKm || 0) * 10) / 10} km</p>
                  <p className="text-[10px] text-slate-500">{t.waypoints?.length || 0} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
