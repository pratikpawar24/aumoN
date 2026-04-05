import React from 'react';
import { Users, Leaf, MapPin, Clock, TrendingDown } from 'lucide-react';
import { formatDistance, formatEmission, formatDuration } from '../../utils/helpers';

const RideMatch = ({ match }) => {
  if (!match) return null;
  const route   = match.sharedRoute || {};
  const savings = match.co2SavedG || 0;

  return (
    <div className="glass rounded-xl border border-primary-500/40
                    bg-primary-500/5 p-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center
                        justify-center animate-pulse-green">
          <Users className="w-4 h-4 text-primary-400" />
        </div>
        <div>
          <h3 className="font-semibold text-primary-400">🎉 Carpool Match Found!</h3>
          <p className="text-xs text-slate-400">
            {match.passengerCount} passenger{match.passengerCount !== 1 ? 's' : ''} matched
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { icon: MapPin,       label: 'Distance', val: formatDistance(route.totalDistanceKm || 0) },
          { icon: Clock,        label: 'Time',     val: formatDuration(route.estimatedTimeMin || 0) },
          { icon: TrendingDown, label: 'CO₂ Saved',val: formatEmission(savings) },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="text-center glass rounded-lg py-2">
            <Icon className="w-3.5 h-3.5 text-primary-400 mx-auto mb-1" />
            <p className="text-xs font-semibold text-white">{val}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {match.savingsPercent > 0 && (
        <div className="flex items-center gap-2 text-xs text-primary-400
                        bg-primary-500/10 rounded-lg px-3 py-2">
          <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Saving <strong>{match.savingsPercent}%</strong> CO₂ by sharing this ride!
            Equivalent to planting <strong>{Math.round(savings / 21000)}</strong> tree(s).
          </span>
        </div>
      )}
    </div>
  );
};

export default RideMatch;