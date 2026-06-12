import React from 'react';
import { Check } from 'lucide-react';
import { useMapContext } from '../../context/MapContext';
import { formatDistance, formatDuration, formatEmission } from '../../utils/helpers';
import { ROUTE_COLORS } from '../../utils/constants';

// Friendly route-type label from the route's optimization profile.
const typeLabel = (route) => {
  if (route?.label) return route.label;
  return ({
    carbon:   'Eco route',
    time:     'Fastest route',
    distance: 'Shortest route',
    balanced: 'Balanced route',
  }[route?.profile]) || 'Route';
};

// Selectable cards for the (up to 3) routes drawn on the map. The selected
// card is highlighted; tapping another promotes it to the bold primary.
const RouteOptions = () => {
  const { routeOptions, selectedRouteIdx, selectRoute } = useMapContext();
  if (!routeOptions || routeOptions.length < 2) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-400 px-1">
        {routeOptions.length} route options — tap to compare
      </h4>
      {routeOptions.map((r, i) => {
        const selected = i === selectedRouteIdx;
        const color = r.color || ROUTE_COLORS[r.profile] || '#3b82f6';
        return (
          <button
            key={`opt-${i}`}
            onClick={() => selectRoute(i, r)}
            className={`w-full rounded-xl border p-3 text-left transition-all
                        ${selected ? 'border-white/40' : 'border-white/10 hover:border-white/25'}`}
            style={{ background: selected ? `${color}1f` : 'rgba(30,41,59,0.8)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-sm font-medium text-white truncate">
                  {typeLabel(r)}
                </span>
                {i === 0 && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-400
                                   border border-white/15 rounded px-1.5 py-0.5">
                    Primary
                  </span>
                )}
              </div>
              {selected
                ? <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                : <span className="text-xs text-slate-400 flex-shrink-0">
                    Score {Math.round(r.green_score || 0)}
                  </span>}
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>🕑 {formatDuration(r.total_time_minutes)}</span>
              <span>📏 {formatDistance(r.total_distance_km)}</span>
              <span className="ml-auto text-green-400/90">
                {formatEmission(r.total_emissions_g)} CO₂
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default RouteOptions;
