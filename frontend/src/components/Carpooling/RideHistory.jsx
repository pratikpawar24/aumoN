import React, { useEffect } from 'react';
import { useCarpool } from '../../hooks/useCarpool';
import { formatEmission, formatRelativeTime } from '../../utils/helpers';
import { Leaf, Clock, IndianRupee, Users } from 'lucide-react';
import { Spinner } from '../Common/Loading';

const STATUS_STYLE = {
  pending:   'text-amber-500 bg-amber-500/10',
  matching:  'text-amber-500 bg-amber-500/10',
  matched:   'text-green-500 bg-green-500/10',
  completed: 'text-blue-400 bg-blue-400/10',
  cancelled: 'text-slate-400 bg-slate-400/10',
};

const RideCard = ({ req }) => {
  const matchedCount = (req.matchedWith || []).length;
  return (
    <div className="rounded-xl border aumo-border p-4 aumo-bg-surface">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs aumo-text-subtle">
          {formatRelativeTime(req.createdAt)}
          <span className="ml-2 aumo-text-muted">· {req.role}</span>
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[req.status] || 'text-slate-400 bg-slate-400/10'}`}>
          {req.status === 'pending' ? 'scheduled' : req.status}
        </span>
      </div>
      <p className="text-sm aumo-text-primary truncate">
        {req.pickup?.address || 'Unknown'} → {req.dropoff?.address || 'Unknown'}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs aumo-text-subtle">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(req.departureTime).toLocaleString()}
        </span>
        {req.role === 'driver' && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />{req.seatsAvailable} seat{req.seatsAvailable === 1 ? '' : 's'} left
          </span>
        )}
        {matchedCount > 0 && (
          <span className="flex items-center gap-1 text-green-500">
            <Users className="w-3 h-3" />{matchedCount} matched
          </span>
        )}
        {req.price != null && (
          <span className="flex items-center gap-0.5">
            <IndianRupee className="w-3 h-3" />{req.price}
          </span>
        )}
      </div>
      {req.matchId?.co2SavedG > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-green-500">
          <Leaf className="w-3 h-3" />
          <span>Saved {formatEmission(req.matchId.co2SavedG)} CO₂</span>
        </div>
      )}
    </div>
  );
};

const RideHistory = () => {
  const { history, loading, loadHistory } = useCarpool();

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  // "Upcoming / scheduled" = still-active statuses with a future departure.
  const upcoming = history.filter(
    (r) => ['pending', 'matching', 'matched'].includes(r.status)
      && new Date(r.departureTime).getTime() >= now
  );
  const past = history.filter((r) => !upcoming.includes(r));

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  if (!history.length) {
    return (
      <div className="text-center py-12 aumo-text-subtle">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>You haven't scheduled any rides yet.</p>
        <p className="text-xs mt-1">Use the Schedule tab to book your first ride.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold aumo-text-primary">Scheduled rides</h3>
          <span className="text-xs aumo-text-subtle">{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs aumo-text-subtle">No upcoming rides — schedule one to see it here.</p>
        ) : (
          upcoming.map((r) => <RideCard key={r._id} req={r} />)
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold aumo-text-primary">Past rides</h3>
            <span className="text-xs aumo-text-subtle">{past.length}</span>
          </div>
          {past.map((r) => <RideCard key={r._id} req={r} />)}
        </section>
      )}
    </div>
  );
};

export default RideHistory;
