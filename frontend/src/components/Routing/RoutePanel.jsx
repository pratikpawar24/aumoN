import React, { useCallback, useState } from 'react';
import { Navigation, Leaf, ChevronDown, ChevronUp, Locate } from 'lucide-react';
import SearchBox     from '../Map/SearchBox';
import CarbonScore   from './CarbonScore';
import RouteDetails  from './RouteDetails';
import RouteOptions  from './RouteOptions';
import StartTripButton from './StartTripButton';
import TripSummary from './TripSummary';
import { useMapContext } from '../../context/MapContext';
import { useRoute }      from '../../hooks/useRoute';
import { useMap }        from '../../hooks/useMap';
import { useAuth }       from '../../hooks/useAuth';
import { useTripTracker } from '../../hooks/useTripTracker';
import { OPTIMIZE_OPTIONS } from '../../utils/constants';
import { Spinner }   from '../Common/Loading';
import mapService    from '../../services/mapService';
import toast         from 'react-hot-toast';

const RoutePanel = () => {
  const {
    origin, setOrigin,
    destination, setDestination,
    currentRoute,
  } = useMapContext();
  const { calculateRoute, calculateBoth, loading } = useRoute();
  const { flyTo, loadPOIs }         = useMap();
  const { setUserLocation } = useMapContext();
  const { user } = useAuth();

  // Vehicle type now comes from the user's profile rather than a map control —
  // the map UI only chooses the optimization mode (Eco / Fastest).
  const vehicleType = user?.vehicleType || 'car';
  const [optimizeFor,    setOptimizeFor]    = useState('carbon');
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const [departureTime,  setDepartureTime]  = useState('');
  const [avoidCongestion,setAvoidCongestion]= useState(true);
  const [avoidTolls,     setAvoidTolls]     = useState(false);
  const [tripStarting, setTripStarting] = useState(false);
  const [weather, setWeather] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);

  const handleReroute = useCallback(async () => {
    if (!origin || !destination) return;
    toast('Off-route — recalculating…', { icon: '🧭' });
    await calculateRoute(origin, destination, {
      vehicleType, optimizeFor,
      departureTime: departureTime || null,
      avoidCongestion,
      avoidTolls,
    });
  }, [origin, destination, vehicleType, optimizeFor, departureTime, avoidCongestion, avoidTolls, calculateRoute]);

  const tracker = useTripTracker({ onReroute: handleReroute });

  const handleOriginSelect = async (loc) => {
    if (!loc) { setOrigin(null); return; }
    setOrigin(loc);
    flyTo(loc.lat, loc.lng, 14);
    loadPOIs(loc.lat, loc.lng, 1500);
  };

  const handleDestSelect = (loc) => {
    if (!loc) { setDestination(null); return; }
    setDestination(loc);
  };

  const handleUseMyLocation = async () => {
    try {
      toast.loading('Getting your location...', { id: 'loc' });
      const loc  = await mapService.getUserLocation();
      const addr = await mapService.nominatimReverse(loc.lat, loc.lng);
      const location = {
        lat: loc.lat, lng: loc.lng,
        address: addr?.display_name ||
          `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
      };
      setOrigin(location);
      flyTo(loc.lat, loc.lng, 15);
      loadPOIs(loc.lat, loc.lng, 1500);
      toast.success('Location set!', { id: 'loc' });
    } catch {
      toast.error('Could not get location', { id: 'loc' });
    }
  };

  const handleCalculate = async () => {
    if (!origin || !destination) {
      toast.error('Please enter both origin and destination');
      return;
    }
    await calculateBoth(origin, destination, {
      vehicleType, optimizeFor,
      departureTime: departureTime || null,
      avoidCongestion,
      avoidTolls,
    });
    // Fetch weather at origin for context. Silently null when not configured.
    try {
      const res = await mapService.getWeather(origin.lat, origin.lng);
      setWeather(res.weather || null);
    } catch {
      setWeather(null);
    }
  };

  const handleSwap = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  // Bridge tracker.position → MapContext.userLocation so the marker layer
  // renders the live GPS dot.
  React.useEffect(() => {
    if (tracker.position) {
      setUserLocation({ lat: tracker.position.lat, lng: tracker.position.lng });
    }
  }, [tracker.position, setUserLocation]);

  const handleStartTrip = async () => {
    if (!currentRoute || !origin || !destination) {
      toast.error('Calculate a route first');
      return;
    }
    setTripStarting(true);
    try {
      await tracker.startTrip({
        origin, destination,
        route: currentRoute,
        rideId: currentRoute.rideId,
      });
      toast.success('Trip started — drive safe! 🌿');
    } catch (err) {
      toast.error(err.message || 'Could not start trip');
    } finally {
      setTripStarting(false);
    }
  };

  const handleStopTrip = async () => {
    try {
      const finishedTrip = await tracker.endTrip();
      if (finishedTrip) {
        setTripSummary(finishedTrip);
      } else {
        toast.success('Trip ended');
      }
    } catch (err) {
      toast.error('Could not end trip');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-bold text-white">Plan Route</h2>
        </div>

        {/* Origin / Destination */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchBox
                label="From"
                placeholder="Origin — building, address..."
                value={origin?.address || ''}
                onSelect={handleOriginSelect}
                icon={<div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
              />
            </div>
            <button
              onClick={handleUseMyLocation}
              title="Use my location"
              className="mt-5 p-3 rounded-xl border border-white/10
                         text-green-400 hover:text-green-300 transition-colors"
              style={{ background: 'rgba(30,41,59,0.8)' }}
            >
              <Locate className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="text-slate-400 hover:text-green-400 text-xs transition-colors"
            >
              ⇅ Swap
            </button>
          </div>

          <SearchBox
            label="To"
            placeholder="Destination — shop, bus stop..."
            value={destination?.address || ''}
            onSelect={handleDestSelect}
            icon={<div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
          />
        </div>

        {/* Optimize for — only Eco vs Fastest. Clicking a mode after a route
            already exists triggers a fresh recalculation in that mode plus its
            complementary mode, so the map always shows comparable routes. */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Optimize For
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OPTIMIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setOptimizeFor(opt.value);
                  // Auto-recalculate the selected mode + its pair when
                  // changing modes after a route is already on screen.
                  if (origin && destination && currentRoute) {
                    calculateBoth(origin, destination, {
                      vehicleType, optimizeFor: opt.value,
                      departureTime: departureTime || null,
                      avoidCongestion,
                    });
                  }
                }}
                className={`flex items-center justify-center gap-2 px-3 py-3 min-h-[48px]
                            rounded-xl border text-sm font-medium transition-all
                            ${optimizeFor === opt.value
                              ? 'text-white'
                              : 'border-white/10 text-slate-400 hover:border-white/30'}`}
                style={optimizeFor === opt.value
                  ? { borderColor: opt.color,
                      backgroundColor: `${opt.color}20`,
                      color: opt.color }
                  : { background: 'rgba(30,41,59,0.8)' }}
              >
                <span className="text-base">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced((p) => !p)}
          className="w-full flex items-center justify-between px-3 py-2
                     text-xs text-slate-400 hover:text-white transition-colors"
        >
          <span>Advanced Options</span>
          {showAdvanced
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />}
        </button>

        {showAdvanced && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Departure Time
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white
                           border border-white/10 focus:border-green-500/50
                           focus:outline-none"
                style={{ background: 'rgba(30,41,59,0.8)' }}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAvoidCongestion((p) => !p)}
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                style={{ background: avoidCongestion ? '#22c55e' : '#475569' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full
                               shadow transition-transform"
                  style={{
                    transform: avoidCongestion
                      ? 'translateX(20px)'
                      : 'translateX(2px)',
                  }}
                />
              </div>
              <span className="text-xs text-slate-300">Avoid congestion</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAvoidTolls((p) => !p)}
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                style={{ background: avoidTolls ? '#22c55e' : '#475569' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full
                               shadow transition-transform"
                  style={{
                    transform: avoidTolls ? 'translateX(20px)' : 'translateX(2px)',
                  }}
                />
              </div>
              <span className="text-xs text-slate-300">Avoid toll roads</span>
            </label>
          </div>
        )}

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={loading || !origin || !destination}
          className="w-full py-3.5 bg-green-500 hover:bg-green-600
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl transition-all
                     flex items-center justify-center gap-2
                     shadow-lg"
        >
          {loading ? (
            <><Spinner size="sm" color="white" />Calculating...</>
          ) : (
            <><Leaf className="w-4 h-4" />Find Eco Route</>
          )}
        </button>

        {/* Results */}
        {currentRoute && (
          <div className="space-y-3">
            {weather && (
              <div className="rounded-xl border border-white/10 px-3 py-2 flex items-center gap-2 text-xs"
                   style={{ background: 'rgba(30,41,59,0.8)' }}>
                <span className="text-base">
                  {weather.condition === 'Clear'      ? '☀️'
                   : weather.condition === 'Rain'     ? '🌧️'
                   : weather.condition === 'Drizzle'  ? '🌦️'
                   : weather.condition === 'Clouds'   ? '☁️'
                   : weather.condition === 'Snow'     ? '❄️'
                   : weather.condition === 'Thunderstorm' ? '⛈️'
                   : '🌡️'}
                </span>
                <span className="text-white font-medium">{weather.temperatureC}°C</span>
                <span className="text-slate-400 capitalize">{weather.description}</span>
                <span className="ml-auto text-slate-500">{weather.windKmh} km/h wind</span>
              </div>
            )}
            <CarbonScore
              score={currentRoute.green_score}
              co2Saved={currentRoute.carbon_saved_g}
              emission={currentRoute.total_emissions_g}
              savingsPercent={currentRoute.co2_savings_percent}
            />
            <RouteDetails route={currentRoute} />
            <StartTripButton
              isAvailable={tracker.isAvailable}
              tracking={tracker.tracking}
              starting={tripStarting}
              position={tracker.position}
              onStart={handleStartTrip}
              onStop={handleStopTrip}
            />
            <RouteOptions />
          </div>
        )}
      </div>

      {tripSummary && (
        <TripSummary trip={tripSummary} onClose={() => setTripSummary(null)} />
      )}
    </div>
  );
};

export default RoutePanel;