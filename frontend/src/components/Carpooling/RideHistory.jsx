import React, { useEffect } from 'react';
import { useCarpool } from '../../hooks/useCarpool';
import { formatEmission, formatRelativeTime } from '../../utils/helpers';
import { Leaf, Clock } from 'lucide-react';
import { Spinner } from '../Common/Loading';

const RideHistory = () => {
  const { history, loading, loadHistory } = useCarpool();

  useEffect(() => { loadHistory(); }, []);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  if (!history.length) return (
    <div className="text-center py-12 text-slate-400">
      <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>No carpool history yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {history.map((req) => (
        <div key={req._id} className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">{formatRelativeTime(req.createdAt)}</span>
            <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full capitalize">
              {req.status}
            </span>
          </div>
          <p className="text-sm text-slate-300 truncate">
            {req.pickup?.address || 'Unknown'} → {req.dropoff?.address || 'Unknown'}
          </p>
          {req.matchId?.co2SavedG > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary-400">
              <Leaf className="w-3 h-3" />
              <span>Saved {formatEmission(req.matchId.co2SavedG)} CO₂</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RideHistory;