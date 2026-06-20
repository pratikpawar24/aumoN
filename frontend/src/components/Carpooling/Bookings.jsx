import React, { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../Common/Loading';
import { Users, Clock, IndianRupee, Check, X } from 'lucide-react';
import carpoolService from '../../services/carpoolService';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  requested: 'text-amber-500 bg-amber-500/10',
  confirmed: 'text-green-500 bg-green-500/10',
  declined:  'text-red-400 bg-red-400/10',
  cancelled: 'text-slate-400 bg-slate-400/10',
};

const Row = ({ b, who, children }) => {
  const ride = b.rideId || {};
  return (
    <div className="rounded-xl border aumo-border p-4 aumo-bg-surface space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium aumo-text-primary">{who}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[b.status]}`}>{b.status}</span>
      </div>
      <p className="text-sm aumo-text-primary truncate">
        {ride.pickup?.address || 'Pickup'} → {ride.dropoff?.address || 'Drop-off'}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs aumo-text-subtle">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.seats} seat{b.seats === 1 ? '' : 's'}</span>
        {ride.departureTime && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ride.departureTime).toLocaleString()}</span>
        )}
        {b.agreedPrice != null && (
          <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{b.agreedPrice}</span>
        )}
      </div>
      {children}
    </div>
  );
};

const Bookings = () => {
  const [data, setData] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await carpoolService.listBookings();
      setData({ incoming: res.incoming || [], outgoing: res.outgoing || [] });
    } catch {
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, label) => {
    setBusy(id);
    try { await fn(id); toast.success(label); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const { incoming, outgoing } = data;
  if (!incoming.length && !outgoing.length) {
    return (
      <div className="text-center py-12 aumo-text-subtle">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No booking requests yet.</p>
        <p className="text-xs mt-1">Request seats from Find Rides, or offer a ride to receive requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {incoming.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold aumo-text-primary">Requests for your rides</h3>
          {incoming.map((b) => (
            <Row key={b._id} b={b} who={b.passengerId?.name || 'Passenger'}>
              {b.status === 'requested' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => act(b._id, carpoolService.confirmBooking, 'Booking confirmed')}
                          disabled={busy === b._id}
                          className="flex-1 py-2.5 min-h-[44px] bg-green-500 hover:bg-green-600 disabled:opacity-50
                                     text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />Confirm
                  </button>
                  <button onClick={() => act(b._id, carpoolService.declineBooking, 'Booking declined')}
                          disabled={busy === b._id}
                          className="px-4 py-2.5 min-h-[44px] border aumo-border text-sm rounded-xl aumo-text-muted
                                     hover:aumo-text-primary flex items-center justify-center gap-1.5">
                    <X className="w-4 h-4" />Decline
                  </button>
                </div>
              )}
              {b.status === 'confirmed' && (
                <button onClick={() => act(b._id, carpoolService.cancelBooking, 'Booking cancelled')}
                        disabled={busy === b._id}
                        className="w-full py-2.5 min-h-[44px] border aumo-border text-sm rounded-xl text-red-400
                                   hover:bg-red-500/10">
                  Cancel booking
                </button>
              )}
            </Row>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold aumo-text-primary">Your seat requests</h3>
          {outgoing.map((b) => (
            <Row key={b._id} b={b} who={b.driverId?.name || 'Driver'}>
              {['requested', 'confirmed'].includes(b.status) && (
                <button onClick={() => act(b._id, carpoolService.cancelBooking, 'Booking cancelled')}
                        disabled={busy === b._id}
                        className="w-full py-2.5 min-h-[44px] border aumo-border text-sm rounded-xl text-red-400
                                   hover:bg-red-500/10">
                  Cancel request
                </button>
              )}
            </Row>
          ))}
        </section>
      )}
    </div>
  );
};

export default Bookings;
