import React from 'react';
import { useMapContext } from '../../context/MapContext';
import { formatDistance, formatDuration, formatEmission } from '../../utils/helpers';
import { ROUTE_COLORS } from '../../utils/constants';

const AlternativeRoutes = ({ alternatives = [] }) => {
  const { setCurrentRoute } = useMapContext();
  if (!alternatives.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-400 px-1">Alternative Routes</h4>
      {alternatives.map((alt, i) => (
        <button
          key={i}
          onClick={() => setCurrentRoute(alt)}
          className="w-full glass rounded-xl border border-white/10 p-3
                     hover:border-white/30 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: alt.color || ROUTE_COLORS[alt.profile] }}
              />
              <span className="text-sm font-medium text-white group-hover:text-primary-400
                               transition-colors">
                {alt.label || `Alternative ${i + 1}`}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Score: <span className="text-primary-400 font-medium">{Math.round(alt.green_score || 0)}</span>
            </span>
          </div>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>{formatDistance(alt.total_distance_km)}</span>
            <span>{formatDuration(alt.total_time_minutes)}</span>
            <span className="ml-auto">{formatEmission(alt.total_emissions_g)} CO₂</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AlternativeRoutes;