import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getCongestionColor } from '../../utils/helpers';

const CongestionAlert = ({ conditions, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (conditions?.dominant_congestion === 'heavy' ||
        conditions?.dominant_congestion === 'gridlock') {
      setVisible(true);
    }
  }, [conditions?.dominant_congestion]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss && onDismiss();
  };

  if (!visible || !conditions) return null;

  const color = getCongestionColor(conditions.dominant_congestion);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                    glass rounded-xl border shadow-2xl px-5 py-3
                    flex items-center gap-3 min-w-72 max-w-sm animate-slide-up"
         style={{ borderColor: `${color}40` }}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color }} />
      <div className="flex-1">
        <p className="text-sm font-medium text-white">
          {conditions.dominant_congestion === 'gridlock'
            ? '🚨 Gridlock Alert!'
            : '⚠️ Heavy Traffic Ahead'}
        </p>
        <p className="text-xs text-slate-400">
          {Math.round(conditions.average_speed_kmh || 0)} km/h avg —
          Consider eco-routing
        </p>
      </div>
      <button onClick={handleDismiss}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CongestionAlert;