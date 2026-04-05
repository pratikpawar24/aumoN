import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createCustomIcon, createPulsingIcon } from '../../utils/mapUtils';

const MarkerLayer = ({ origin, destination, userLocation, carpoolMarkers = [] }) => {
  const originIcon      = createCustomIcon('🟢', '#22c55e', 40);
  const destIcon        = createCustomIcon('🔴', '#ef4444', 40);
  const userIcon        = createPulsingIcon('#3b82f6');
  const carpoolIcon     = createCustomIcon('🚗', '#8b5cf6', 36);

  return (
    <>
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">📍 Your Location</p>
              <p className="text-gray-500 text-xs">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-green-700">🟢 Origin</p>
              <p className="text-gray-600 text-xs mt-1">{origin.address || 'Starting point'}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-red-600">🔴 Destination</p>
              <p className="text-gray-600 text-xs mt-1">{destination.address || 'End point'}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {carpoolMarkers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={carpoolIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-purple-700">🚗 {m.label || 'Carpool Point'}</p>
              {m.name && <p className="text-gray-600 text-xs">{m.name}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default MarkerLayer;