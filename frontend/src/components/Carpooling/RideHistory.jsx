import React, { useEffect, useMemo, useState } from 'react';
import { useCarpool } from '../../hooks/useCarpool';
import { formatEmission, formatRelativeTime } from '../../utils/helpers';
import { Leaf, Clock, Filter, IndianRupee } from 'lucide-react';
import { Spinner } from '../Common/Loading';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'matched',   label: 'Matched' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ROLE_OPTIONS = [
  { value: '',          label: 'Any role' },
  { value: 'driver',    label: 'As driver' },
  { value: 'passenger', label: 'As passenger' },
];

const RideHistory = () => {
  const { history, loading, loadHistory } = useCarpool();
  const [filters, setFilters] = useState({ from: '', to: '', status: '', role: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    const params = {};
    if (filters.from)   params.from   = new Date(filters.from).toISOString();
    if (filters.to)     params.to     = new Date(filters.to).toISOString();
    if (filters.status) params.status = filters.status;
    if (filters.role)   params.role   = filters.role;
    loadHistory(params);
  };

  const reset = () => {
    setFilters({ from: '', to: '', status: '', role: '' });
    loadHistory();
  };

  const list = useMemo(() => history, [history]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters((p) => !p)}
          className="flex items-center gap-1.5 text-sm aumo-text-muted hover:aumo-text-primary"
        >
          <Filter className="w-4 h-4" />
          Filters {showFilters ? '▲' : '▼'}
        </button>
        <span className="text-xs aumo-text-subtle">{list.length} rides</span>
      </div>

      {showFilters && (
        <div className="rounded-xl border aumo-border p-4 aumo-bg-surface space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs aumo-text-subtle mb-1 block">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 min-h-[44px] text-sm aumo-text-primary
                           aumo-bg-input border aumo-border focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs aumo-text-subtle mb-1 block">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 min-h-[44px] text-sm aumo-text-primary
                           aumo-bg-input border aumo-border focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm aumo-text-primary
                         aumo-bg-input border aumo-border focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={filters.role}
              onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
              className="rounded-xl px-3 py-2.5 min-h-[44px] text-sm aumo-text-primary
                         aumo-bg-input border aumo-border focus:outline-none"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={apply}
                    className="flex-1 py-2.5 min-h-[44px] bg-green-500 hover:bg-green-600 text-white
                               text-sm font-medium rounded-xl">
              Apply
            </button>
            <button onClick={reset}
                    className="px-4 py-2.5 min-h-[44px] border aumo-border aumo-text-muted
                               text-sm rounded-xl hover:aumo-text-primary">
              Reset
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !list.length ? (
        <div className="text-center py-12 aumo-text-subtle">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No rides match those filters.</p>
        </div>
      ) : (
        list.map((req) => (
          <div key={req._id}
               className="rounded-xl border aumo-border p-4 aumo-bg-surface">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs aumo-text-subtle">
                {formatRelativeTime(req.createdAt)}
                <span className="ml-2 aumo-text-muted">· {req.role}</span>
              </span>
              <span className="text-xs text-green-500 px-2 py-0.5 rounded-full capitalize bg-green-500/10">
                {req.status}
              </span>
            </div>
            <p className="text-sm aumo-text-primary truncate">
              {req.pickup?.address || 'Unknown'} → {req.dropoff?.address || 'Unknown'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs aumo-text-subtle">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(req.departureTime).toLocaleString()}
              </span>
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
        ))
      )}
    </div>
  );
};

export default RideHistory;
