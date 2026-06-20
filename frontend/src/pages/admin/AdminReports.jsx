import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { Users, Car, Leaf, Route, Download } from 'lucide-react';

const Stat = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl p-4 border border-indigo-500/20" style={{ background: 'rgba(255,255,255,0.03)' }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <Icon className="w-4 h-4 text-indigo-400" />
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getReports()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const header = 'Name,Email,Trips,CO2 saved (kg),Distance (km),Carpools joined';
    const rows = data.topUsers.map((u) =>
      [u.name, u.email, u.totalTrips, u.totalCO2SavedKg, u.totalDistanceKm, u.carpoolsJoined]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aumon-user-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return <p className="text-sm text-slate-400">Could not load reports.</p>;

  const { app, topUsers } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Aggregate user and network activity.</p>
        </div>
        <button onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-sm
                           text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Users" value={app.users} />
        <Stat icon={Users} label="Verified" value={app.verified} />
        <Stat icon={Car} label="Total trips" value={app.totalTrips} />
        <Stat icon={Route} label="Distance (km)" value={app.totalDistanceKm} />
        <Stat icon={Leaf} label="CO₂ saved (kg)" value={app.totalCO2SavedKg} />
        <Stat icon={Car} label="Carpool rides" value={app.carpoolRides} />
      </div>

      <div className="rounded-xl border border-indigo-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="px-4 py-3 border-b border-indigo-500/20">
          <h2 className="font-semibold text-white">Top users by CO₂ saved</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/5">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Trips</th>
                <th className="px-4 py-2 font-medium">CO₂ (kg)</th>
                <th className="px-4 py-2 font-medium">Distance (km)</th>
                <th className="px-4 py-2 font-medium">Carpools</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u._id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">
                    {u.name}<span className="block text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{u.totalTrips}</td>
                  <td className="px-4 py-2 text-green-400">{u.totalCO2SavedKg}</td>
                  <td className="px-4 py-2 text-slate-300">{u.totalDistanceKm}</td>
                  <td className="px-4 py-2 text-slate-300">{u.carpoolsJoined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
