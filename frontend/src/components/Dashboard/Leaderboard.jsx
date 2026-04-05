import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatEmission } from '../../utils/helpers';
import { Trophy, Leaf } from 'lucide-react';
import { SkeletonCard } from '../Common/Loading';
import { useAuth } from '../../hooks/useAuth';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/emissions/leaderboard?limit=20')
      .then((r) => setLeaders(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="glass rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="font-semibold text-white">Green Leaderboard</h3>
      </div>
      <div className="divide-y divide-white/5">
        {leaders.map((leader, i) => {
          const isMe = leader._id === user?._id;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div
              key={leader._id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors
                          ${isMe ? 'bg-primary-500/10' : 'hover:bg-white/5'}`}
            >
              <span className="w-8 text-center text-sm font-bold text-slate-400">
                {medals[i] || `#${i + 1}`}
              </span>
              <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center
                              justify-center text-primary-400 text-sm font-bold">
                {leader.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isMe ? 'text-primary-400' : 'text-white'}`}>
                  {leader.name} {isMe && '(You)'}
                </p>
                <p className="text-xs text-slate-400">{leader.totalTrips} trips</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary-400">
                  <Leaf className="w-3 h-3" />
                  <span className="text-xs font-medium">{formatEmission(leader.totalCO2Saved || 0)}</span>
                </div>
                <p className="text-xs text-slate-400">Score: {leader.greenScore}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;