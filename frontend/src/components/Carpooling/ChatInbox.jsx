import React, { useEffect, useState } from 'react';
import { MessageSquare, IndianRupee, CheckCircle2 } from 'lucide-react';
import carpoolService from '../../services/carpoolService';
import { Spinner } from '../Common/Loading';
import { formatRelativeTime } from '../../utils/helpers';

// Inbox of the user's 1:1 carpool conversations — both rides they're driving
// (incoming passenger enquiries) and rides they've messaged a driver about.
const ChatInbox = ({ onOpenThread, refreshKey = 0 }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    carpoolService.listThreads()
      .then((d) => { if (!cancelled) setThreads(d.threads || []); })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  if (!threads.length) {
    return (
      <div className="text-center py-12 aumo-text-subtle">
        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No conversations yet</p>
        <p className="text-xs aumo-text-subtle mt-1">
          Message a driver from “Find Rides” to negotiate and confirm a seat.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((t) => {
        // The person on the other end of this thread.
        const other = t.iAmDriver ? t.peer : t.ride?.userId;
        const name = other?.name || (t.iAmDriver ? 'Passenger' : 'Driver');
        return (
          <button
            key={`${t.rideId}_${t.peerId}`}
            onClick={() => onOpenThread(t)}
            className="w-full rounded-xl border aumo-border p-3 text-left aumo-bg-surface
                       hover:border-green-500/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center
                              text-green-500 text-sm font-bold flex-shrink-0">
                {name[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium aumo-text-primary truncate">{name}</span>
                  <span className="text-[10px] uppercase tracking-wide aumo-text-subtle
                                   border aumo-border rounded px-1.5 py-0.5">
                    {t.iAmDriver ? 'Driving' : 'Passenger'}
                  </span>
                  {t.confirmed && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs aumo-text-subtle truncate mt-0.5">{t.lastBody}</p>
                <p className="text-[11px] aumo-text-subtle truncate mt-0.5">
                  {t.ride?.pickup?.address?.split(',')[0]} → {t.ride?.dropoff?.address?.split(',')[0]}
                  {t.ride?.price != null && (
                    <span className="inline-flex items-center ml-2">
                      <IndianRupee className="w-3 h-3" />{t.ride.price}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-[11px] aumo-text-subtle flex-shrink-0 self-start">
                {formatRelativeTime(t.lastAt)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatInbox;
