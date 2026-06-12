import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const MapContext = createContext(null);

export const MapProvider = ({ children }) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter]       = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom]           = useState(13);
  // Default to the street (OSM) basemap when the map opens.
  const [mapStyle, setMapStyle]         = useState('osm');
  const [origin, setOrigin]             = useState(null);
  const [destination, setDestination]   = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  // The "paired" route — same OD, different optimization mode. Drawn on
  // the map as a dotted line so the user can compare the selected mode
  // with its complementary mode at a glance.
  // Pair table: carbon ↔ time, distance ↔ balanced.
  const [pairedRoute, setPairedRoute]   = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  // The full set of routes shown on the map at once (primary + alternatives,
  // up to 3). `selectedRouteIdx` is the bold/primary one; tapping a card or
  // polyline promotes that route to selected.
  const [routeOptions, setRouteOptions]       = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [pois, setPois]                 = useState([]);
  const [busStops, setBusStops]         = useState([]);
  const [buildings, setBuildings]       = useState([]);
  const [trafficData, setTrafficData]   = useState(null);
  const [showPOIs, setShowPOIs]         = useState(true);
  const [showBusStops, setShowBusStops] = useState(true);
  const [showBuildings, setShowBuildings] = useState(false);
  const [showTraffic, setShowTraffic]   = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating]     = useState(false);

  const flyTo = useCallback((lat, lng, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    }
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
  }, []);

  // Promote one of the route options to the bold/selected route.
  const selectRoute = useCallback((idx, route) => {
    setSelectedRouteIdx(idx);
    if (route) setCurrentRoute(route);
  }, []);

  const clearRoute = useCallback(() => {
    setCurrentRoute(null);
    setPairedRoute(null);
    setAlternatives([]);
    setRouteOptions([]);
    setSelectedRouteIdx(0);
  }, []);

  const clearAll = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setCurrentRoute(null);
    setPairedRoute(null);
    setAlternatives([]);
    setRouteOptions([]);
    setSelectedRouteIdx(0);
  }, []);

  return (
    <MapContext.Provider
      value={{
        mapRef,
        mapCenter, setMapCenter,
        mapZoom, setMapZoom,
        mapStyle, setMapStyle,
        origin, setOrigin,
        destination, setDestination,
        currentRoute, setCurrentRoute,
        pairedRoute, setPairedRoute,
        alternatives, setAlternatives,
        routeOptions, setRouteOptions,
        selectedRouteIdx, setSelectedRouteIdx,
        selectRoute,
        pois, setPois,
        busStops, setBusStops,
        buildings, setBuildings,
        trafficData, setTrafficData,
        showPOIs, setShowPOIs,
        showBusStops, setShowBusStops,
        showBuildings, setShowBuildings,
        showTraffic, setShowTraffic,
        userLocation, setUserLocation,
        isLocating, setIsLocating,
        flyTo,
        clearRoute,
        clearAll,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
};

export default MapContext;