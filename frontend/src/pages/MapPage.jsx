import React, { useEffect, useState } from 'react';
import MapView     from '../components/Map/MapView';
import RoutePanel  from '../components/Routing/RoutePanel';
import { useMap }  from '../hooks/useMap';
import { useMapContext } from '../context/MapContext';
import {
  Layers, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react';

const mapStyles = [
  { id: 'dark',      label: 'Dark',      icon: '🌙' },
  { id: 'osm',       label: 'Street',    icon: '🗺️' },
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  { id: 'light',     label: 'Light',     icon: '☀️' },
];

const MapPage = () => {
  const {
    setMapStyle, mapStyle,
    showPOIs,     setShowPOIs,
    showBusStops, setShowBusStops,
    showTraffic,  setShowTraffic,
  } = useMapContext();
  const { loadPOIs, getUserLocation } = useMap();

  const [panelOpen, setPanelOpen] = useState(true);
  const [layerOpen, setLayerOpen] = useState(false);

  useEffect(() => {
    getUserLocation()
      .then((loc) => { if (loc) loadPOIs(loc.lat, loc.lng, 1500); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = (latlng) => {
    loadPOIs(latlng.lat, latlng.lng, 1000);
  };

  return (
    <div className="fixed inset-0 pt-16 flex">
      {/* Side panel */}
      <div
        className="relative z-20 flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{ width: panelOpen ? '384px' : '0px' }}
      >
        <div className="w-96 h-full border-r aumo-border aumo-bg-nav"
             style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <RoutePanel />
        </div>
      </div>

      {/* Panel toggle */}
      <button
        onClick={() => setPanelOpen((p) => !p)}
        className="absolute top-1/2 -translate-y-1/2 z-30 w-6 h-16
                   border aumo-border rounded-r-lg aumo-bg-nav
                   flex items-center justify-center
                   aumo-text-subtle hover:aumo-text-primary transition-all"
        style={{ left: panelOpen ? '384px' : '0px' }}
      >
        {panelOpen
          ? <ChevronLeft className="w-3 h-3" />
          : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView onMapClick={handleMapClick} className="w-full h-full" />

        {/* Layer controls */}
        <div className="absolute top-4 right-4 z-10 space-y-2">
          <div className="relative">
            <button
              onClick={() => setLayerOpen((p) => !p)}
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl border aumo-border
                         aumo-bg-nav flex items-center justify-center
                         aumo-text-subtle hover:aumo-text-primary transition-all shadow-md"
              title="Map layers"
            >
              <Layers className="w-4 h-4" />
            </button>

            {layerOpen && (
              <div className="absolute top-12 right-0 rounded-xl border aumo-border aumo-bg-popover
                              shadow-xl w-36 py-1">
                {mapStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setMapStyle(s.id); setLayerOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm
                                transition-colors text-left
                                ${mapStyle === s.id
                                  ? 'text-green-500 bg-green-500/10'
                                  : 'aumo-text-muted hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    <span>{s.icon}</span>{s.label}
                  </button>
                ))}

                <div className="border-t aumo-border pt-1 mt-1 px-3 space-y-2 pb-2">
                  {[
                    { label: 'POIs',      state: showPOIs,     set: setShowPOIs     },
                    { label: 'Bus Stops', state: showBusStops, set: setShowBusStops },
                    { label: 'Traffic',   state: showTraffic,  set: setShowTraffic  },
                  ].map(({ label, state, set }) => (
                    <button
                      key={label}
                      onClick={() => set((p) => !p)}
                      className="w-full flex items-center justify-between text-xs
                                 aumo-text-subtle hover:aumo-text-primary transition-colors"
                    >
                      <span>{label}</span>
                      {state
                        ? <Eye    className="w-3 h-3 text-green-500" />
                        : <EyeOff className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;