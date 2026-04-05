import React, { useEffect, useState } from 'react';
import { Users, Plus, Clock, CheckCircle, XCircle, Leaf } from 'lucide-react';
import { useCarpool } from '../../hooks/useCarpool';
import { useAuth }    from '../../hooks/useAuth';
import RideRequest    from './RideRequest';
import RideMatch      from './RideMatch';
import RideHistory    from './RideHistory';
import { formatDistance, formatEmission, formatRelativeTime } from '../../utils/helpers';
import { Spinner } from '../Common/Loading';

const STATUS_CONFIG = {
  pending:   { color: '#f59e0b', icon: Clock,         label: 'Pending'   },
  matching:  { color: '#3b82f6', icon: Clock,         label: 'Matching'  },
  matched:   { color: '#22c55e', icon: CheckCircle,   label: 'Matched'   },
  completed: { color: '#64748b', icon: CheckCircle,   label: 'Completed' },
  cancelled: { color: '#ef4444', icon: XCircle,       label: 'Cancelled' },
};

const CarpoolDashboard = () => {
  const { user }     = useAuth();
  const { requests, loading, matchResult, loadMyRequests, cancelRequest } = useCarpool();
  const [activeTab,  setActiveTab]  = useState('requests');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadMyRequests(); }, []);

  const tabs = [
    { id: 'requests', label: 'My Requests', count: requests.length },
    { id: 'history',  label: 'History'  },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-400" />
            Smart Carpool
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Share rides, reduce emissions together
          </p>
        </div>
        <button
          onClick={() => setShowCreate((p) => !p)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500
                     hover:bg-primary-600 text-white rounded-xl font-medium
                     transition-colors shadow-lg shadow-primary-500/25"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Create request form */}
      {showCreate && (
        <div className="animate-slide-up">
          <RideRequest onSuccess={() => { setShowCreate(false); loadMyRequests(); }} />
        </div>
      )}

      {/* Match result notification */}
      {matchResult?.match && (
        <RideMatch match={matchResult.match} />
      )}

      {/* Tabs */}
      <div className="flex gap-2 glass rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
                        ${activeTab === tab.id
                          ? 'bg-primary-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : activeTab === 'requests' ? (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No active requests</p>
              <p className="text-sm text-slate-500 mt-1">Create one to start carpooling!</p>
            </div>
          ) : (
            requests.map((req) => {
              const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const Icon = sc.icon;
              return (
                <div key={req._id} className="glass rounded-xl border border-white/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: sc.color }} />
                      <span className="text-sm font-medium" style={{ color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(req.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex gap-2 text-xs text-slate-300">
                      <span className="text-green-400">From:</span>
                      <span className="truncate">{req.pickup?.address || 'Pickup location'}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-300">
                      <span className="text-red-400">To:</span>
                      <span className="truncate">{req.dropoff?.address || 'Drop-off location'}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(req.departureTime).toLocaleString()}
                    </div>
                  </div>

                  {req.matchId && (
                    <div className="flex items-center gap-1.5 text-xs text-primary-400
                                    bg-primary-500/10 rounded-lg px-3 py-1.5 mb-3">
                      <Leaf className="w-3 h-3" />
                      <span>Matched! Check your match for route details.</span>
                    </div>
                  )}

                  {['pending', 'matching'].includes(req.status) && (
                    <button
                      onClick={() => cancelRequest(req._id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <RideHistory />
      )}
    </div>
  );
};

export default CarpoolDashboard;