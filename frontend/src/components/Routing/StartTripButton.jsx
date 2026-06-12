import React from 'react';
import { Play, Square, Navigation } from 'lucide-react';
import { Spinner } from '../Common/Loading';

/**
 * Renders nothing when geolocation is unsupported or permission is denied,
 * matching Google Maps / Waze behavior. The button is the user's intent
 * signal that triggers the permission prompt the first time.
 */
const StartTripButton = ({
  isAvailable, tracking, starting, position, progress,
  onStart, onStop,
}) => {
  if (!isAvailable) return null;

  if (tracking) {
    // Live ETA from remaining distance + current speed (fall back to a 30 km/h
    // city average when GPS speed is unavailable).
    let etaMin = null;
    if (progress?.remainingKm != null) {
      const kmh = progress.speedMps && progress.speedMps > 0.5
        ? progress.speedMps * 3.6
        : 30;
      etaMin = Math.round((progress.remainingKm / kmh) * 60);
    }

    return (
      <div className="rounded-xl border border-green-500/30 p-3 space-y-2"
           style={{ background: 'rgba(34,197,94,0.10)' }}>
        <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Trip in progress
        </div>

        {progress?.remainingKm != null && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white">
                {progress.remainingKm.toFixed(1)} km left
              </span>
              {etaMin != null && (
                <span className="text-xs text-slate-300">≈ {etaMin} min</span>
              )}
            </div>
            {/* Progress bar — fills as the remaining distance shrinks. */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-500"
                   style={{ width: `${progress.progressPercent || 0}%` }} />
            </div>
            <p className="text-[11px] text-slate-400">
              {progress.distanceTraveledKm?.toFixed(1) ?? '0.0'} km travelled · {progress.progressPercent || 0}% there
            </p>
          </div>
        )}

        {position && (
          <p className="text-xs text-slate-400">
            <Navigation className="w-3 h-3 inline mr-1" />
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            {position.accuracy != null && (
              <span className="ml-2 text-slate-500">±{Math.round(position.accuracy)}m</span>
            )}
          </p>
        )}
        <button
          onClick={onStop}
          className="w-full py-3 min-h-[44px] flex items-center justify-center gap-2
                     bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl
                     transition-all"
        >
          <Square className="w-4 h-4" /> End Trip
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={starting}
      className="w-full py-3 min-h-[44px] flex items-center justify-center gap-2
                 bg-blue-500 hover:bg-blue-600 disabled:opacity-50
                 text-white font-semibold rounded-xl transition-all
                 shadow-lg shadow-blue-500/20"
    >
      {starting
        ? <><Spinner size="sm" color="white" />Starting...</>
        : <><Play className="w-4 h-4" /> Start Trip</>}
    </button>
  );
};

export default StartTripButton;
