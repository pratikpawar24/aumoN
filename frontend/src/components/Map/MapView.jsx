import React, { useEffect, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, useMap, useMapEvents, ZoomControl
} from 'react-leaflet';
import { useMapContext } from '../../context/MapContext';
import { MAP_TILES, MAP_ATTRIBUTIONS, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import RouteLayer    from './RouteLayer';
import MarkerLayer   from './MarkerLayer';
import POILayer      from './POILayer';
import TrafficLayer  from './TrafficLayer';
import 'leaflet/dist/leaflet.css';

// Inner component: sync map ref & events
const MapController = ({ onMapClick }) => {
  const map = useMap();
  const { mapRef, mapCenter, mapZoom } = useMapContext();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
  });

  return null;
};

const MapView = ({ onMapClick, className = '' }) => {
  const {
    mapStyle, mapCenter, mapZoom,
    currentRoute, alternatives,
    origin, destination,
    pois, busStops, buildings,
    showPOIs, showBusStops, showBuildings,
    trafficData, showTraffic,
    userLocation,
  } = useMapContext();

  const tileUrl   = MAP_TILES[mapStyle]   || MAP_TILES.dark;
  const tileAttrib = mapStyle === 'satellite'
    ? MAP_ATTRIBUTIONS.satellite
    : MAP_ATTRIBUTIONS.carto;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
        className="rounded-none"
      >
        <TileLayer url={tileUrl} attribution={tileAttrib} maxZoom={19} />
        <ZoomControl position="bottomright" />
        <MapController onMapClick={onMapClick} />

        {/* Traffic overlay */}
        {showTraffic && trafficData && (
          <TrafficLayer data={trafficData} />
        )}

        {/* POIs layer */}
        {showPOIs && (
          <POILayer
            pois={pois}
            busStops={showBusStops ? busStops : []}
            buildings={showBuildings ? buildings : []}
          />
        )}

        {/* Route layers */}
        {alternatives.map((alt, i) => (
          <RouteLayer
            key={`alt_${i}`}
            route={alt}
            isSelected={false}
            isAlternative
          />
        ))}
        {currentRoute && (
          <RouteLayer route={currentRoute} isSelected />
        )}

        {/* Markers */}
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