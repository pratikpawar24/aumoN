import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';
import { formatEmission } from '../../utils/helpers';
import { Leaf, TrendingDown, Car, TreePine } from 'lucide-react';
import { SkeletonCard } from '../Common/Loading';

const StatCard = ({ icon: Icon, label, value, sub, color = '#22c55e' }) => (
  <div className="glass rounded-xl p-4 border border-white/10">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
           style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  </div>
);

const VEHICLE_COLORS = {
  car: '#ef4444', electric: '#06b6d4', bus: '#f59e0b',
  bike: '#22c55e', walk: '#86efac', motorcycle: '#f97316',
};

const EmissionStats = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/emissions/stats');
        setStats(res.data.stats);
      } catch (err) {
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <SkeletonCard key={i} />)}
    </div>
  );

  if (!stats) return (
    <div className="text-center py-12 text-slate-400">
      <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>No emission data yet.</p>
      <p className="text-sm mt-1">Start planning routes to see your carbon footprint.</p>
    </div>
  );

  const monthlyData = (stats.monthly || []).map((m) => ({
    month: m.month,
    emitted: Math.round((m.emitted || 0) / 1000),
    saved:   Math.round((m.saved   || 0) / 1000),
    trips:   m.trips || 0,
  }));

  const vehicleData = Object.entries(stats.byVehicle || {}).map(([mode, data]) => ({
    name:  mode,
    value: data.trips || 0,
    color: VEHICLE_COLORS[mode] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingDown} label="CO₂ Saved" color="#22c55e"
          value={formatEmission(stats.totalSavedG || 0)}
          sub="vs baseline trips"
        />
        <StatCard
          icon={Car} label="Total Trips" color="#3b82f6"
          value={stats.tripCount || 0}
          sub={`${stats.carpooledTrips || 0} carpooled`}
        />
        <StatCard
          icon={Leaf} label="Green Score" color="#f59e0b"
          value={stats.avgGreenScore || 50}
          sub="/ 100 average"
        />
        <StatCard
          icon={TreePine} label="Trees Equivalent" color="#22c55e"
          value={stats.equivalentTrees || 0}
          sub="trees saved / year"
        />
      </div>

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div className="glass rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Monthly CO₂ (kg)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="emittedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155',
                                borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="saved" stroke="#22c55e"
                    fill="url(#savedGrad)" name="CO₂ Saved (kg)" strokeWidth={2} />
              <Area type="monotone" dataKey="emitted" stroke="#ef4444"
                    fill="url(#emittedGrad)" name="CO₂ Emitted (kg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vehicle breakdown */}
      {vehicleData.length > 0 && (
        <div className="glass rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Trips by Vehicle</h3>
          <div className="flex items-center gap-6">
            <PieChart width={120} height={120}>
              <Pie data={vehicleData} cx={55} cy={55} innerRadius={30}
                   outerRadius={50} dataKey="value" paddingAngle={3}>
                {vehicleData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2">
              {vehicleData.map((v) => (
                <div key={v.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                    <span className="text-slate-300 capitalize">{v.name}</span>
                  </div>
                  <span className="text-white font-medium">{v.value} trips</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmissionStats;