import React, { useEffect } from 'react';
import { useRoute } from '../../hooks/useRoute';
import { formatDistance, formatDuration, formatEmission,
         formatRelativeTime, getVehicleIcon } from '../../utils/helpers';
import { Leaf, MapPin, Clock } from 'lucide-react';
import { SkeletonCard, Spinner } from '../Common/Loading';

const TripHistory = () => {
  const { rideHistory, historyLoading, loadHistory } = useRoute();
  useEffect(() => { loadHistory(); }, []);

  if (historyLoading) return (
    <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
  );

  if (!rideHistory.length) return (
    <div className="text-center py-12 text-slate-400">
      <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p>No trips yet.</p>
      <p className="text-sm mt-1">Plan your first route on the Map page!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {rideHistory.map((ride) => (
        <div key={ride._id} className="glass rounded-xl border border-white/10 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getVehicleIcon(ride.vehicleType)}</span>
              <div>
                <p className="text-xs text-slate-400">{formatRelativeTime(ride.createdAt)}</p>
                {ride.isCarpooled && (
                  <span className="text-xs text-purple-400 bg-purple-500/10
                                   px-2 py-0.5 rounded-full">Carpool</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary-400">
                Score: {Math.round(ride.greenScore || 50)}
              </p>
            </div>
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex gap-2 text-xs text-slate-300">
              <span className="text-green-400 flex-shrink-0">From:</span>
              <span className="truncate">{ride.origin?.address || 'Origin'}</span>
            </div>
            <div className="flex gap-2 text-xs text-slate-300">
              <span className="text-red-400 flex-shrink-0">To:</span>
              <span className="truncate">{ride.destination?.address || 'Destination'}</span>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{formatDistance(ride.distanceKm)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatDuration(ride.timeMinutes)}
            </span>
            <span className="flex items-center gap-1 ml-auto text-primary-400">
              <Leaf className="w-3 h-3" />
              {ride.co2Saved > 0 ? `Saved ${formatEmission(ride.co2Saved)}` : formatEmission(ride.co2Emissions)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TripHistory;