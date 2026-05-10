import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import routeService from '../services/routeService';
import { Spinner } from '../components/Common/Loading';
import { BarChart3, Trophy, History, Car, Leaf, Clock, IndianRupee } from 'lucide-react';
import {
  Co2OverTime, RidesOverTime, TimeSavedBar, CostSavedBar,
  VehicleDistributionPie, RoleSplitPie,
} from '../components/Dashboard/AnalyticsCharts';
import Leaderboard from '../components/Dashboard/Leaderboard';
import TripHistory from '../components/Dashboard/TripHistory';

const PERIODS = [
  { id: 'week',  label: 'Week'  },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year'  },
];

const TABS = [
  { id: 'analytics',   label: 'Analytics', icon: BarChart3 },
  { id: 'history',     label: 'Trips',     icon: History },
  { id: 'leaderboard', label: 'Leaders',   icon: Trophy },
];

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-2xl p-4 border aumo-border aumo-bg-surface">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs uppercase tracking-wider aumo-text-subtle">{label}</span>
      <Icon className="w-4 h-4 text-green-500" />
    </div>
    <p className="text-2xl font-bold aumo-text-primary">{value}</p>
    {sub && <p className="text-xs aumo-text-subtle mt-1">{sub}</p>}
  </div>
);

const Analytics = () => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    routeService.getAnalytics(period)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [period]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return <p className="text-center py-12 aumo-text-subtle">No analytics yet.</p>;

  const t = data.totals;

  return (
    <div className="space-y-5">
      {/* Period switcher */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-xl p-1 border aumo-border aumo-bg-surface">
          {PERIODS.map((p) => (
            <button key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-4 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors
                                ${period === p.id
                                  ? 'bg-green-500 text-white'
                                  : 'aumo-text-subtle hover:aumo-text-primary'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Car}         label="Total trips" value={t.trips}             sub={`${t.distanceKm} km traveled`} />
        <StatCard icon={Leaf}        label="CO₂ saved"   value={`${t.co2SavedKg} kg`} sub="vs solo petrol car" />
        <StatCard icon={Clock}       label="Time saved"  value={`${t.timeSavedHours} h`} sub="vs avg city traffic" />
        <StatCard icon={IndianRupee} label="Cost saved"  value={`₹${t.costSavedInr}`} sub="fuel + carpool share" />
      </div>

      {/* Pies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <VehicleDistributionPie data={data.vehicleDistribution} />
        <RoleSplitPie            data={data.roleSplit} />
      </div>

      {/* Lines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Co2OverTime   data={data.co2Series} />
        <RidesOverTime data={data.co2Series} />
      </div>

      {/* Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TimeSavedBar data={data.monthlySeries} />
        <CostSavedBar data={data.monthlySeries} />
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('analytics');

  return (
    <div className="min-h-screen aumo-bg-page pt-20 pb-8 px-4">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        {user && (
          <div className="rounded-2xl p-5 border aumo-border aumo-bg-surface
                          flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center
                            text-green-500 text-xl font-bold flex-shrink-0 bg-green-500/15">
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold aumo-text-primary">{user.name}</h1>
              <p className="text-sm aumo-text-subtle truncate">
                Green Score {user.greenScore || 0}/100 · {user.totalTrips || 0} trips lifetime
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-500">
                {Math.round((user.totalCO2Saved || 0) / 1000 * 10) / 10} kg
              </p>
              <p className="text-xs aumo-text-subtle">CO₂ saved lifetime</p>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 rounded-xl p-1 border aumo-border aumo-bg-surface">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px]
                          rounded-lg text-sm font-medium transition-all
                          ${tab === id
                            ? 'bg-green-500 text-white shadow'
                            : 'aumo-text-subtle hover:aumo-text-primary'}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'analytics'   && <Analytics />}
        {tab === 'history'     && <TripHistory />}
        {tab === 'leaderboard' && <Leaderboard />}
      </div>
    </div>
  );
};

export default DashboardPage;
