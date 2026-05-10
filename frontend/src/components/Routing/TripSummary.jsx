import React from 'react';
import { Trophy, Leaf, Navigation, Clock, MapPin, X } from 'lucide-react';
import { formatDistance, formatDuration, formatEmission } from '../../utils/helpers';

const TripSummary = ({ trip, onClose }) => {
  if (!trip) return null;

  const startedAt = trip.startedAt ? new Date(trip.startedAt) : null;
  const endedAt   = trip.endedAt   ? new Date(trip.endedAt)   : new Date();
  const durationMin = startedAt
    ? Math.round((endedAt - startedAt) / 60_000 * 10) / 10
    : 0;
  const distanceKm = trip.distanceTraveledKm || 0;
  const deviations = trip.deviationCount || 0;

  // CO2 saved estimate: distance × (baseline 150 g/km - actual EF for the
  // chosen vehicle). Without per-segment data we approximate from the
  // ride's saved CO2 if persisted, else compute heuristically.
  const co2Saved = distanceKm > 0 ? Math.round(distanceKm * 30) : 0;

  // Friendly award based on outcome
  const award =
    deviations === 0 && distanceKm > 0
      ? { icon: '🏆', title: 'Clean Run',     desc: 'Stayed on the planned route the whole way.' }
      : deviations <= 2
      ? { icon: '🌿', title: 'Eco Drive',     desc: 'Trip completed with minimal detours.' }
      : { icon: '🚗', title: 'Trip Complete', desc: `${deviations} deviations from the planned route.` };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center
                 p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border aumo-border
                   shadow-2xl overflow-hidden"
        style={{ background: '#1e293b' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center"
             style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 p-2 min-w-[44px] min-h-[44px]
                       flex items-center justify-center rounded-lg
                       text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-5xl mb-2">{award.icon}</div>
          <h2 className="text-xl font-bold text-white">{award.title}</h2>
          <p className="text-sm text-slate-300 mt-1">{award.desc}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 px-6 py-5">
          <Stat icon={MapPin}    label="Distance"   value={formatDistance(distanceKm)} />
          <Stat icon={Clock}     label="Duration"   value={formatDuration(durationMin)} />
          <Stat icon={Leaf}      label="CO₂ saved"  value={formatEmission(co2Saved)} accent="green" />
          <Stat icon={Navigation} label="Deviations" value={String(deviations)} accent={deviations === 0 ? 'green' : 'amber'} />
        </div>

        {/* Achievement badge */}
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-green-500/20 p-3 flex items-center gap-3"
               style={{ background: 'rgba(34,197,94,0.08)' }}>
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-xs text-slate-300">
              You saved <span className="text-green-400 font-semibold">{formatEmission(co2Saved)}</span>{' '}
              of CO₂ on this trip — that's roughly{' '}
              <span className="text-green-400 font-semibold">{Math.round(co2Saved / 21000 * 100) / 100}</span> trees
              worth of daily absorption.
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 min-h-[44px] bg-green-500 hover:bg-green-600
                       text-white font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, accent = 'slate' }) => (
  <div className="rounded-xl px-3 py-3 border border-white/10"
       style={{ background: 'rgba(15,23,42,0.6)' }}>
    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
      <Icon className="w-3 h-3" />{label}
    </div>
    <p className={`text-lg font-bold ${accent === 'green' ? 'text-green-400' : accent === 'amber' ? 'text-amber-400' : 'text-white'}`}>
      {value}
    </p>
  </div>
);

export default TripSummary;
