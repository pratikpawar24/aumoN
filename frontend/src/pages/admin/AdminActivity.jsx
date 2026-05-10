import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { Spinner } from '../../components/Common/Loading';
import { Activity } from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';

const AdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.adminActivity({ limit: 200 })
      .then((data) => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
      </div>

      {!logs.length ? (
        <p className="text-center py-12 text-slate-500">No admin actions recorded yet.</p>
      ) : (
        <div className="rounded-xl border border-indigo-500/20 overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          {logs.map((l) => (
            <div key={l._id}
                 className="px-4 py-2.5 border-b border-white/5 last:border-0 grid grid-cols-[1fr,auto] gap-2">
              <div className="min-w-0">
                <p className="text-sm text-white">
                  <span className={l.actorRole === 'admin_master' ? 'text-amber-400' : 'text-indigo-400'}>
                    {l.actorId?.name || 'Admin'}
                  </span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="font-mono text-xs">{l.action}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {l.targetType} {l.targetId ? `#${String(l.targetId).slice(-6)}` : ''}
                  {l.metadata?.reason && ` · "${l.metadata.reason}"`}
                  {l.metadata?.email && ` · ${l.metadata.email}`}
                </p>
              </div>
              <span className="text-xs text-slate-500">{formatRelativeTime(l.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActivity;
