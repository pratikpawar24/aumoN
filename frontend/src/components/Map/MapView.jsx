import React, { useEffect } from 'react';
import {
  MapContainer, TileLayer, useMap, useMapEvents, ZoomControl
} from 'react-leaflet';
import { useMapContext } from '../../context/MapContext';
import {
  MAP_TILES, MAP_ATTRIBUTIONS, DEFAULT_CENTER, DEFAULT_ZOOM
} from '../../utils/constants';
import RouteLayer   from './RouteLayer';
import MarkerLayer  from './MarkerLayer';
import POILayer     from './POILayer';
import TrafficLayer from './TrafficLayer';
import 'leaflet/dist/leaflet.css';

const MapController = ({ onMapClick }) => {
  const map = useMap();
  const { mapRef } = useMapContext();

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