import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Clock, IndianRupee, Users, MessageSquare, Locate } from 'lucide-react';
import SearchBox from '../Map/SearchBox';
import { Spinner } from '../Common/Loading';
import { useCarpool } from '../../hooks/useCarpool';
import mapService from '../../services/mapService';
import { formatRelativeTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'time',      label: 'Soonest' },
  { value: 'price',     label: 'Price (low → high)' },
  { value: 'proximity', label: 'Nearest pickup' },
];

const FindRides = ({ onOpenChat }) => {
  const { available, loading, loadAvailable } = useCarpool();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [sort, setSort] = useState('relevance');
  const [radius, setRadius] = useState(5);
  const [searched, setSearched] = useState(false);

  // Default load: nearest rides to user's current location
  useEffect(() => {
    let cancelled = false;
    mapService.getUserLocation().then((loc) => {
      if (cancelled || !loc) return;
      loadAvailable({ fromLat: loc.lat, fromLng: loc.lng, fromRadius: radius, sort: 'proximity' });
    }).catch(() => {
      // fall back to a no-filter listing if geolocation denied
      loadAvailable({ sort: 'time' });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    const params = { sort, fromRadius: radius, toRadius: radius };
    if (from)  { params.fromLat = from.lat; params.fromLng = from.lng; }
    if (to)    { params.toLat   = to.lat;   params.toLng   = to.lng;   }
    if (!from && !to) {
      toast('Searching all upcoming rides', { icon: '🔍' });
    }
    setSearched(true);
    await loadAvailable(params);
  };

  const handleUseMyLocation = async () => {
    try {
      const loc = await mapService.getUserLocation();
      const addr = await mapService.nominatimReverse(loc.lat, loc.lng);
      setFrom({ lat: loc.lat, lng: loc.lng, address: addr?.display_name || 'My location' });
    } catch {
      toast.error('Could not get your location');
    }
  };

  const grouped = useMemo(() => available, [available]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="rounded-xl border aumo-border p-4 space-y-3 aumo-bg-surface">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBox
              label="From"
              placeholder="Pickup near…"
              onSelect={setFrom}
              value={from?.address || ''}
              icon={<div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
            />
          </div>
          <button
            onClick={handleUseMyLocation}
            title="Use my location"
            className="mt-5 p-3 min-w-[44px] min-h-[44px] rounded-xl border aumo-border
                       text-green-500 hover:text-green-600 transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>
        </div>

        <SearchBox
          label="To"
          placeholder="Drop-off near…"
          onSelect={setTo}
          value={to?.address || ''}
          icon={<div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
        />

        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="flex-1 rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                       border aumo-border aumo-bg-input focus:outline-none focus:border-green-500/50"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
            className="rounded-xl px-3 py-3 min-h-[44px] text-sm aumo-text-primary
                       border aumo-border aumo-bg-input focus:outline-none focus:border-green-500/50"
          >
            {[1, 3, 5, 10, 20].map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-3 min-h-[44px] bg-green-500 hover:bg-green-600 disabled:opacity-50
                       text-white text-sm font-semibold rounded-xl transition-all
                       flex items-center gap-2"
          >
            <Search className="w-4 h-4" />Search
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !grouped.length ? (
        <div className="text-center py-12 aumo-text-subtle">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{searched ? 'No rides match your search' : 'No rides available right now'}</p>
          <p className="text-xs aumo-text-subtle mt-1">
            {searched ? 'Try a wider radius or different times' : 'Check back later or schedule one yourself'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((r) => (
            <RideCard key={r._id} ride={r} onOpenChat={onOpenChat} />
          ))}
        </div>
      )}
    </div>
  );
};

const RideCard = ({ ride, onOpenChat }) => {
  const driver = ride.userId || {};
  return (
    <div className="rounded-xl border aumo-border p-4 aumo-bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center
                          text-green-500 text-sm font-bold">
            {(driver.name || 'D')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium aumo-text-primary">{driver.name || 'Driver'}</p>
            <p className="text-xs aumo-text-subtle">{driver.vehicleType || 'car'} · score {driver.greenScore ?? 50}</p>
          </div>
        </div>
        {ride.price != null && (
          <div className="flex items-center gap-0.5 text-green-500 font-semibold">
            <IndianRupee className="w-4 h-4" />
            <span>{ride.price}</span>
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="aumo-text-primary truncate">{ride.pickup?.address || 'Pickup'}</span>
          {ride.pickupDistanceKm != null && (
            <span className="ml-auto text-xs aumo-text-subtle">{ride.pickupDistanceKm} km</span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="aumo-text-primary truncate">{ride.dropoff?.address || 'Drop-off'}</span>
          {ride.dropoffDistanceKm != null && (
            <span className="ml-auto text-xs aumo-text-subtle">{ride.dropoffDistanceKm} km</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs aumo-text-subtle">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(ride.departureTime).toLocaleString()}
        </span>
        <span>
          {ride.seatsAvailable} seat{ride.seatsAvailable === 1 ? '' : 's'} left
        </span>
      </div>

      {ride.notes && (
        <p className="text-xs aumo-text-subtle italic">"{ride.notes}"</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onOpenChat?.(ride)}
          className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5
                     border aumo-border rounded-xl text-sm aumo-text-primary
                     hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
      </div>
    </div>
  );
};

export default FindRides;
