import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useTraffic } from '../../hooks/useTraffic';
import { useMapContext } from '../../context/MapContext';
import { getCongestionColor } from '../../utils/helpers';
import { Spinner } from '../Common/Loading';

const CongestionBadge = ({ level }) => {
  const color = getCongestionColor(level);
  const labels = {
    free_flow: 'Free Flow',
    moderate:  'Moderate',
    heavy:     'Heavy',
    gridlock:  'Gridlock',
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ background: color }}
    >
      {labels[level] || level}
    </span>
  );
};

const TrafficPredictor = () => {
  const { userLocation } = useMapContext();
  const { trafficData, conditions, loading, loadTraffic } = useTraffic();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userLocation) {
      loadTraffic(userLocation.lat, userLocation.lng, 5);
    }
  }, [userLocation?.lat, userLocation?.lng]);

  const handleRefresh = async () => {
    if (!userLocation) return;
    setRefreshing(true);
    await loadTraffic(userLocation.lat, userLocation.lng, 5);
    setRefreshing(false);
  };

  if (!userLocation) return (
    <div className="glass rounded-xl p-4 border border-white/10 text-center">
      <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <p className="text-sm text-slate-400">Enable location to see traffic</p>
    </div>
  );

  return (
    <div className="glass rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">Traffic Conditions</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="text-xs text-slate-400 hover:text-primary-400 transition-colors
                     flex items-center gap-1"
        >
          {refreshing ? <Spinner size="sm" /> : <Clock className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      <div className="p-4">
        {loading && !trafficData ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : conditions ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Current Conditions</span>
              <CongestionBadge level={conditions.dominant_congestion || 'moderate'} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Average Speed</span>
              <span className="text-sm font-medium text-white">
                {Math.round(conditions.average_speed_kmh || 40)} km/h
              </span>
            </div>
            {conditions.dominant_congestion === 'heavy' ||
             conditions.dominant_congestion === 'gridlock' ? (
              <div className="flex items-start gap-2 bg-orange-500/10 rounded-lg p-3
                              border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  Heavy congestion detected. Consider eco-route or carpooling to save emissions.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-primary-500/10 rounded-lg p-3
                              border border-primary-500/20">
                <CheckCircle className="w-4 h-4 text-primary-400" />
                <p className="text-xs text-primary-300">
                  Good traffic conditions. Great time for your eco-commute!
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">
            No traffic data available
          </p>
        )}
      </div>
    </div>
  );
};

export default TrafficPredictor;