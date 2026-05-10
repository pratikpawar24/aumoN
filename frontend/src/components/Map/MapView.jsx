import React, { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, useMap, useMapEvents, ZoomControl
} from 'react-leaflet';
import { useMapContext } from '../../context/MapContext';
import { useMap as useMapHook } from '../../hooks/useMap';
import {
  MAP_TILES, MAP_ATTRIBUTIONS, DEFAULT_CENTER, DEFAULT_ZOOM
} from '../../utils/constants';
import RouteLayer   from './RouteLayer';
import MarkerLayer  from './MarkerLayer';
import POILayer     from './POILayer';
import TrafficLayer from './TrafficLayer';
import 'leaflet/dist/leaflet.css';

// Below this zoom we don't bother fetching POIs — there are too many to
// be useful and Overpass would rate-limit us. 14 is roughly "city
// neighbourhood" — close enough that schools / hospitals / hotels /
// restaurants / petrol pumps make sense to display.
const POI_MIN_ZOOM = 14;

// Don't refetch if the map center moved less than this from the last
// fetch — keeps Overpass calls bounded while panning.
const POI_REFETCH_M = 400;

const haversineM = (a, b) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const MapController = ({ onMapClick }) => {
  const map = useMap();
  const { mapRef } = useMapContext();
  const { loadPOIs } = useMapHook();
  const lastFetchRef = useRef(null);  // [lat, lng, zoom]

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  // Trigger POI fetch when the map zooms in enough or pans far enough.
  const maybeFetchPOIs = () => {
    const zoom = map.getZoom();
    if (zoom < POI_MIN_ZOOM) return;
    const c = map.getCenter();
    const here = [c.lat, c.lng];
    const last = lastFetchRef.current;
    if (last && haversineM(here, [last[0], last[1]]) < POI_REFETCH_M) return;
    lastFetchRef.current = [c.lat, c.lng, zoom];
    // Radius scales with zoom — tighter at high zoom, wider at lower.
    const radius = zoom >= 16 ? 800 : 1500;
    loadPOIs(c.lat, c.lng, radius);
  };

  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
    zoomend: maybeFetchPOIs,
    moveend: maybeFetchPOIs,
  });

  return null;
};

const MapView = ({ onMapClick, className = '' }) => {
  const {
    mapStyle,
    currentRoute,
    origin, destination,
    pois, busStops, buildings,
    showPOIs, showBusStops, showBuildings,
    trafficData, showTraffic,
    userLocation,
  } = useMapContext();

  const tileUrl    = MAP_TILES[mapStyle]    || MAP_TILES.dark;
  const tileAttrib = mapStyle === 'satellite'
    ? MAP_ATTRIBUTIONS.satellite
    : MAP_ATTRIBUTIONS.carto;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={tileUrl} attribution={tileAttrib} maxZoom={19} />
        <ZoomControl position="bottomright" />
        <MapController onMapClick={onMapClick} />

        {showTraffic && trafficData && (
          <TrafficLayer data={trafficData} />
        )}

        {showPOIs && (
          <POILayer
            pois={pois}
            busStops={showBusStops ? busStops : []}
            buildings={showBuildings ? buildings : []}
          />
        )}

        {/* Only the currently-selected route is drawn on the map.
            Alternatives appear in the side panel; clicking one moves it
            into currentRoute and replaces what's drawn here. */}
        {currentRoute && (
          <RouteLayer route={currentRoute} isSelected />
        )}

        <MarkerLayer
          origin={origin}
          destination={destination}
          userLocation={userLocation}
        />
      </MapContainer>
    </div>
  );
};

export default MapView;
