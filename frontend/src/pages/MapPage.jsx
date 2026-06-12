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

// Small media-query hook so we can branch the layout (overlay drawer on
// phones vs. in-flow panel on desktop) without duplicating markup.
const useMediaQuery = (query) => {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

const PANEL_W = 384;        // desktop panel width (px) — matches RoutePanel's w-96
const MOBILE_DRAWER = 'min(340px, 88vw)';

const MapPage = () => {
  const {
    setMapStyle, mapStyle,
    showPOIs,     setShowPOIs,
    showBusStops, setShowBusStops,
    showTraffic,  setShowTraffic,
    mapRef,
  } = useMapContext();
  const { loadPOIs, getUserLocation } = useMap();

  const isMobile = useMediaQuery('(max-width: 767px)');
  // Panel starts open on desktop, closed on phones so the map is visible first.
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  );
  const [layerOpen, setLayerOpen] = useState(false);

  useEffect(() => {
    getUserLocation()
      .then((loc) => { if (loc) loadPOIs(loc.lat, loc.lng, 1500); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the desktop panel animates its width, the map's flex box resizes —
  // tell Leaflet once the transition has finished so tiles fill correctly.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 320);
    return () => clearTimeout(t);
  }, [panelOpen, isMobile, mapRef]);

  const handleMapClick = (latlng) => {
    loadPOIs(latlng.lat, latlng.lng, 1000);
    // Tapping the map on mobile dismisses the drawer so it never blocks panning.
    if (isMobile && panelOpen) setPanelOpen(false);
  };

  // Toggle button horizontal offset: sits at the panel's right edge.
  const toggleLeft = isMobile
    ? (panelOpen ? MOBILE_DRAWER : '0px')
    : (panelOpen ? `${PANEL_W}px` : '0px');

  return (
    <div className="fixed inset-0 pt-16 flex overflow-hidden">
      {/* Dimming backdrop behind the mobile drawer */}
      {isMobile && panelOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/50"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Side panel — in-flow on desktop, sliding overlay drawer on mobile */}
      <div
        className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${
          isMobile ? 'absolute left-0 top-0 bottom-0 z-30 shadow-2xl' : 'relative z-20 h-full'
        }`}
        style={
          isMobile
            ? {
                width: MOBILE_DRAWER,
                transform: panelOpen ? 'translateX(0)' : 'translateX(-105%)',
              }
            : { width: panelOpen ? `${PANEL_W}px` : '0px' }
        }
      >
        <div
          className="w-full h-full border-r aumo-border aumo-bg-nav"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <RoutePanel />
        </div>
      </div>

      {/* Panel toggle — 44px-friendly tap target on mobile */}
      <button
        onClick={() => setPanelOpen((p) => !p)}
        aria-label={panelOpen ? 'Hide route panel' : 'Show route panel'}
        className="absolute top-1/2 -translate-y-1/2 z-40
                   w-8 md:w-6 h-20 md:h-16
                   border aumo-border rounded-r-lg aumo-bg-nav
                   flex items-center justify-center
                   aumo-text-subtle hover:aumo-text-primary transition-all shadow-md"
        style={{ left: toggleLeft }}
      >
        {panelOpen
          ? <ChevronLeft className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Map — always fills the remaining space (full width on mobile) */}
      <div className="flex-1 relative">
        <MapView onMapClick={handleMapClick} className="w-full h-full" />

        {/* Layer controls — z above Leaflet's own panes (which go up to ~700) */}
        <div className="absolute top-4 right-4 z-[1000] space-y-2">
          <div className="relative">
            <button
              onClick={() => setLayerOpen((p) => !p)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border aumo-border
                         aumo-bg-nav flex items-center justify-center
                         aumo-text-subtle hover:aumo-text-primary transition-all shadow-md"
              title="Map layers"
              aria-label="Map layers"
            >
              <Layers className="w-4 h-4" />
            </button>

            {layerOpen && (
              <div
                className="absolute top-12 right-0 rounded-xl border aumo-border
                           shadow-2xl w-44 py-1 max-h-[70vh] overflow-y-auto z-[1001]"
                // Explicit opaque background so map tiles never bleed through the
                // menu (the translucent token + Leaflet repaints were showing the
                // map behind the panel).
                style={{ background: '#1e293b', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
              >
                {mapStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setMapStyle(s.id); setLayerOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm
                                transition-colors text-left
                                ${mapStyle === s.id
                                  ? 'text-green-500 bg-green-500/10'
                                  : 'aumo-text-muted hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    <span>{s.icon}</span>{s.label}
                  </button>
                ))}

                <div className="border-t aumo-border pt-1 mt-1 px-3 space-y-1 pb-2">
                  {[
                    { label: 'POIs',      state: showPOIs,     set: setShowPOIs     },
                    { label: 'Bus Stops', state: showBusStops, set: setShowBusStops },
                    { label: 'Traffic',   state: showTraffic,  set: setShowTraffic  },
                  ].map(({ label, state, set }) => (
                    <button
                      key={label}
                      onClick={() => set((p) => !p)}
                      className="w-full flex items-center justify-between min-h-[40px] text-xs
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
