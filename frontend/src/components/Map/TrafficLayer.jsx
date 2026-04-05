import React from 'react';
import { Circle, Tooltip } from 'react-leaflet';
import { getCongestionColor } from '../../utils/helpers';

const TrafficLayer = ({ data }) => {
  if (!data?.segments || data.segments.length === 0) return null;

  return (
    <>
      {data.segments.map((seg, i) => {
        if (!seg.lat || !seg.lng) return null;
        const color  = getCongestionColor(seg.congestion_level);
        const radius = seg.congestion_level === 'gridlock' ? 150
                     : seg.congestion_level === 'heavy'    ? 120
                     : 90;

        return (
          <Circle
            key={i}
            center={[seg.lat, seg.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.35,
              weight: 1,
              opacity: 0.6,
            }}
          >
            <Tooltip>
              <span style={{ fontSize: '12px' }}>
                {seg.congestion_level?.replace('_', ' ')} •{' '}
                {Math.round(seg.predicted_speed_kmh || 0)} km/h
              </span>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
};

export default TrafficLayer;