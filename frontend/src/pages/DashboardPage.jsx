import React, { useState } from 'react';
import EmissionStats from '../components/Dashboard/EmissionStats';
import Leaderboard   from '../components/Dashboard/Leaderboard';
import { useAuth }   from '../hooks/useAuth';
import { BarChart3, Trophy, History, User as UserIcon } from 'lucide-react';
import TripHistory   from '../components/Dashboard/TripHistory';

const tabs = [
  { id: 'stats',       label: 'Emissions', icon: BarChart3  },
  { id: 'history',     label: 'Trips',     icon: History    },
  { id: 'leaderboard', label: 'Leaders',   icon: Trophy     },
];

const DashboardPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');

  return (
    <div className="min-h-screen bg-dark-bg pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* User summary */}
        {user && (
          <div className="glass rounded-2xl p-6 border border-white/10
                          flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center
                            justify-center text-primary-400 text-2xl font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex flex-wrap gap-4 mt-2">
                {[
                  { label: 'Green Score', val: `${user.greenScore || 50}/100` },
                  { label: 'Total Trips', val: user.totalTrips || 0           },
                  { label: 'Carpools',    val: user.carpoolsJoined || 0       },
                ].map(({ label, val }) => (
                  <div key={label} className="text-xs">
                    <span className="text-slate-400">{label}: </span>
                    <span className="text-primary-400 font-semibold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-400">
                {Math.round((user.totalCO2Saved || 0) / 1000 * 10) / 10} kg
              </p>
              <p className="text-xs text-slate-400">CO₂ Saved</p>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-2 glass rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2
                                py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                                ${tab === id
                                  ? 'bg-primary-500 text-white shadow'
                                  : 'text-slate-400 hover:text-white'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {tab === 'stats'       && <EmissionStats />}
          {tab === 'history'     && <TripHistory   />}
          {tab === 'leaderboard' && <Leaderboard   />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;