import React, { useState } from 'react';
import {
  Clock, MapPin, Navigation, ChevronDown, ChevronUp,
  Leaf, Zap, Star
} from 'lucide-react';
import {
  formatDistance, formatDuration, formatEmission, getVehicleIcon
} from '../../utils/helpers';
import { useRoute } from '../../hooks/useRoute';

const RouteDetails = ({ route }) => {
  const { saveFavorite } = useRoute();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!route) return null;

  const {
    total_distance_km: dist,
    total_time_minutes: time,
    total_emissions_g: emission,
    carbon_saved_g: saved,
    co2_savings_percent: savingsPct,
    green_score: score,
    vehicle_type: vehicleType,
    label,
    color,
    instructions = [],
    fallback,
    algorithm,
    may_have_tolls: mayHaveTolls,
    toll_estimate: tollEstimate,
  } = route;

  // Surface routing-quality so users know when the polyline isn't a real
  // road route (AI service unreachable, OSRM rate-limited, etc.).
  const isStraightLine = fallback === true || algorithm === 'straight_line_estimate';
  const isOSRMFallback =
    fallback === 'osrm' ||
    algorithm === 'osrm_fallback' ||
    algorithm === 'osrm_alternatives' ||
    algorithm === 'ors_fallback';

  const handleSaveFavorite = () => {
    saveFavorite({
      distanceKm: dist,
      timeMinutes: time,
      vehicleType,
      optimizeFor: route.profile,
      greenScore: score,
    });
  };

  return (
    <div className="glass rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between"
           style={{ borderLeft: `4px solid ${color || '#22c55e'}` }}>
        <div>
          <span className="text-sm font-semibold text-white">{label || 'Eco Route'}</span>
          {vehicleType && (
            <span className="ml-2 text-sm">{getVehicleIcon(vehicleType)}</span>
          )}
        </div>
        <button
          onClick={handleSaveFavorite}
          className="p-1.5 text-slate-400 hover:text-yellow-400 transition-colors"
          title="Save to favorites"
        >
          <Star className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-white/10">
        {[
          { icon: MapPin,   label: 'Distance', value: formatDistance(dist)  },
          { icon: Clock,    label: 'Time',     value: formatDuration(time)  },
          { icon: Leaf,     label: 'CO₂',      value: formatEmission(emission) },
        ].map(({ icon: Icon, label: lbl, value }) => (
          <div key={lbl} className="flex flex-col items-center py-3">
            <Icon className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-sm font-semibold text-white">{value}</span>
            <span className="text-xs text-slate-400">{lbl}</span>
          </div>
        ))}
      </div>

      {/* ETA — local clock-time when leaving now */}
      {time > 0 && (
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400">Arriving</span>
          <span className="text-white font-medium">
            ~{new Date(Date.now() + time * 60_000).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* Toll cost — authoritative when TollGuru is configured, otherwise
          a heuristic warning based on highway-class detection. */}
      {tollEstimate && tollEstimate.hasTolls ? (
        <div className="px-4 py-2 border-t border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">💰 Toll cost</span>
            <span className="text-white font-semibold">
              ≈ ₹{tollEstimate.costInr}
              <span className="text-amber-400/70 ml-1 font-normal">
                · {tollEstimate.count} toll{tollEstimate.count === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          {tollEstimate.tolls?.length > 0 && (
            <div className="mt-1 text-[11px] text-amber-300/80 truncate">
              {tollEstimate.tolls.slice(0, 3).map((t) => t.name).join(' · ')}
              {tollEstimate.tolls.length > 3 && ` +${tollEstimate.tolls.length - 3} more`}
            </div>
          )}
        </div>
      ) : mayHaveTolls && (
        <div className="px-4 py-2 border-t border-amber-500/30 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-400">
          <span>💰</span>
          <span>May include toll roads. Toggle "Avoid tolls" in Advanced Options to bypass.</span>
        </div>
      )}

      {/* Routing-quality notice */}
      {isStraightLine && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30 text-xs text-amber-500">
          ⚠️ No road route found. This is a straight-line estimate; distance and CO₂ are approximate.
        </div>
      )}
      {isOSRMFallback && !isStraightLine && (
        <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/30 text-xs text-blue-400">
          ℹ️ Using fallback router with route alternatives. For richer carbon-aware routing, deploy the AI service.
        </div>
      )}

      {/* CO2 saved badge */}
      {saved > 0 && (
        <div className="px-4 py-2 bg-primary-500/10 border-t border-primary-500/20">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs text-primary-400 font-medium">
              Saving {formatEmission(saved)} CO₂
              {savingsPct != null && ` (−${Math.round(savingsPct)}%)`} vs solo car trip
            </span>
          </div>
        </div>
      )}

      {/* Turn-by-turn instructions */}
      {instructions.length > 0 && (
        <div className="border-t border-white/10">
          <button
            onClick={() => setShowInstructions((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5
                       text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3 h-3" />
              {instructions.length} turn-by-turn steps
            </span>
            {showInstructions
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>

          {showInstructions && (
            <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1.5 animate-fade-in">
              {instructions.map((step, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="w-4 h-4 flex-shrink-0 rounded-full bg-primary-500/20
                                   text-primary-400 flex items-center justify-center
                                   text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-slate-300">{step.instruction}</span>
                  {step.distance_m > 0 && (
                    <span className="ml-auto text-slate-500 flex-shrink-0">
                      {formatDistance(step.distance_m / 1000)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteDetails;