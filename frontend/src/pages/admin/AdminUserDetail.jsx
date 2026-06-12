import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { ShieldOff, ShieldCheck, Trash2, ArrowLeft, Mail, Phone, BadgeCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUser(id);
      setUser(data.user);
      setRides(data.rides || []);
      setSeries((data.series || []).map((d) => ({
        date: d._id,
        co2: Math.round((d.co2Saved || 0) / 1000 * 10) / 10,
        rides: d.rides,
        distance: Math.round((d.distance || 0) * 10) / 10,
      })));
    } catch (err) {
      toast.error('Could not load user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleBlock = async () => {
    const reason = window.prompt('Reason (optional):');
    if (reason === null) return;
    await adminService.blockUser(id, reason);
    toast.success('User blocked');
    load();
  };

  const handleUnblock = async () => {
    await adminService.unblockUser(id);
    toast.success('User unblocked');
    load();
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove this user?')) return;
    await adminService.removeUser(id);
    toast.success('User removed');
    navigate('/admin/users');
  };

  const [verifying, setVerifying] = useState(false);
  const handleVerify = async () => {
    if (!window.confirm(`Mark ${user.name}'s email as verified? They'll get immediate access to carpool.`)) return;
    setVerifying(true);
    try {
      await adminService.verifyUser(id);
      toast.success('User verified');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify user');
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !user) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />Back
      </button>

      <div className="rounded-xl border border-indigo-500/20 p-5 grid sm:grid-cols-[auto,1fr,auto] gap-4 items-start"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="w-16 h-16 rounded-xl bg-indigo-500/20 flex items-center justify-center
                        text-indigo-400 text-2xl font-bold">
          {(user.name || 'U')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />{user.email}</p>
          {user.mobile && (
            <p className="text-sm text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />{user.mobile}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {user.isBlocked && <span className="text-[10px] text-red-400 px-2 py-0.5 rounded bg-red-500/10">BLOCKED</span>}
            {!user.emailVerified && <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">UNVERIFIED</span>}
            <span className="text-[10px] text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 uppercase">
              {user.role}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {user.isBlocked ? (
            <button onClick={handleUnblock}
                    className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-green-400 bg-green-500/10 hover:bg-green-500/20
                               flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />Unblock
            </button>
          ) : (
            <button onClick={handleBlock}
                    className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-amber-400 bg-amber-500/10 hover:bg-amber-500/20
                               flex items-center gap-1.5">
              <ShieldOff className="w-4 h-4" />Block
            </button>
          )}
          <button onClick={handleRemove}
                  className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20
                             flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />Remove
          </button>
        </div>
      </div>

      {/* Email verification */}
      <div className="rounded-xl border border-indigo-500/20 p-4 flex flex-wrap items-center gap-3"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        {user.emailVerified ? (
          <>
            <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-400">
                Email Verified
                {user.verificationMethod === 'admin_manual' && ' (by Admin)'}
              </p>
              {user.verificationMethod === 'admin_manual' && (
                <p className="text-xs text-slate-400">
                  {user.verifiedBy?.email ? `Verified by: ${user.verifiedBy.email}` : 'Verified by an admin'}
                  {user.verifiedAt && ` · ${new Date(user.verifiedAt).toLocaleString()}`}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-400 flex-1 min-w-0">
              Email not verified
            </p>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-3 py-2 min-h-[40px] rounded-lg text-sm text-green-400 bg-green-500/10
                         hover:bg-green-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <BadgeCheck className="w-4 h-4" />
              {verifying ? 'Verifying…' : 'Mark as Verified'}
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total trips',     val: user.totalTrips || 0 },
          { label: 'Carpools joined', val: user.carpoolsJoined || 0 },
          { label: 'CO₂ saved',       val: `${Math.round((user.totalCO2Saved || 0) / 1000)} kg` },
          { label: 'Distance',        val: `${Math.round(user.totalDistanceKm || 0)} km` },
        ].map((s) => (
          <div key={s.label}
               className="rounded-xl p-3 border border-indigo-500/20 text-center"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xl font-bold text-white">{s.val}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CO2 chart */}
      <div className="rounded-xl border border-indigo-500/20 p-4"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <h2 className="font-semibold text-white mb-3">CO₂ saved (last 30 days)</h2>
        {series.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No rides in the last 30 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Line type="monotone" dataKey="co2" stroke="#22c55e" strokeWidth={2} name="CO₂ saved (kg)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent rides */}
      <div className="rounded-xl border border-indigo-500/20 p-4"
           style={{ background: 'rgba(255,255,255,0.03)' }}>
        <h2 className="font-semibold text-white mb-3">Recent rides</h2>
        {rides.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No rides yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rides.map((r) => (
              <div key={r._id}
                   className="text-xs p-2 rounded-lg border border-white/5"
                   style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-white truncate">
                  {r.origin?.address?.split(',')[0] || 'Origin'} → {r.destination?.address?.split(',')[0] || 'Destination'}
                </p>
                <div className="flex gap-3 text-slate-400 mt-0.5">
                  <span>{Math.round(r.distanceKm * 10) / 10} km</span>
                  <span>{Math.round(r.timeMinutes)} min</span>
                  <span>−{Math.round((r.co2Saved || 0) / 1000)} kg CO₂</span>
                  <span className="ml-auto">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserDetail;
