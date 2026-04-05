import React from 'react';
import { Leaf, TrendingDown } from 'lucide-react';
import { formatEmission, formatCO2Saved, getGreenScoreInfo } from '../../utils/helpers';

const CarbonScore = ({ score = 50, co2Saved = 0, emission = 0, size = 'md' }) => {
  const info       = getGreenScoreInfo(score);
  const radius     = 40;
  const circumference = 2 * Math.PI * radius;
  const offset     = circumference - (score / 100) * circumference;

  return (
    <div className="glass rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Score ring */}
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius}
                strokeWidth="8" stroke="#1e293b" fill="none" />
              <circle
                cx="50" cy="50" r={radius}
                strokeWidth="8"
                stroke={info.color}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white leading-none">{Math.round(score)}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: info.color }} className="text-lg">{info.icon}</span>
              <span className="font-semibold text-white text-sm">{info.label}</span>
            </div>
            <p className="text-xs text-slate-400">Green Mobility Score</p>
            <div className="flex items-center gap-1 mt-1">
              <Leaf className="w-3 h-3 text-primary-400" />
              <span className="text-xs text-primary-400">
                {formatEmission(emission)} CO₂
              </span>
            </div>
          </div>
        </div>

        {co2Saved > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary-400 justify-end">
              <TrendingDown className="w-3 h-3" />
              <span className="text-xs font-medium">Saved</span>
            </div>
            <p className="text-sm font-bold text-primary-400">
              {formatEmission(co2Saved)}
            </p>
            <p className="text-xs text-slate-400">vs baseline</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonScore;