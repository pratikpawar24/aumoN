import React, { useEffect, useMemo } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { getRouteStyle, fitMapToRoute } from '../../utils/mapUtils';
import { CONGESTION_COLORS } from '../../utils/constants';

const toLatLng = (pt) => {
  if (!pt) return null;
  if (Array.isArray(pt)) return [pt[0], pt[1]];
  if (pt.lat !== undefined) return [pt.lat, pt.lng];
  return null;
};

// Split the route polyline into congestion-colored segments based on
// traffic_along_route samples. Each sample has a path_index and a
// congestion_level; we color from one sample's index up to the next.
const buildCongestionSegments = (latLngs, samples) => {
  if (!samples || !samples.length) return null;
  const sorted = [...samples].sort((a, b) => (a.path_index ?? 0) - (b.path_index ?? 0));
  const segs = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, sorted[i].path_index ?? 0);
    const end = i + 1 < sorted.length
      ? (sorted[i + 1].path_index ?? latLngs.length - 1)
      : latLngs.length - 1;
    if (end <= start) continue;
    const slice = latLngs.slice(start, end + 1);
    if (slice.length < 2) continue;
    segs.push({
      coords: slice,
      color: CONGESTION_COLORS[sorted[i].congestion_level] || '#6b7280',
      level: sorted[i].congestion_level,
    });
  }
  return segs.length ? segs : null;
};

const RouteLayer = ({ route, isSelected = false, isAlternative = false }) => {
  const map = useMap();

  const geometry = route?.route_geometry || route?.routeGeometry || [];
  const profile  = route?.profile || 'balanced';
  const trafficSamples = route?.traffic_along_route;

  const latLngs = useMemo(
    () => geometry.map(toLatLng).filter(Boolean),
    [geometry]
  );

  useEffect(() => {
    if (isSelected && latLngs.length >= 2) {
      fitMapToRoute(map, latLngs);
    }
  }, [isSelected, map]); // eslint-disable-line react-hooks/exhaustive-deps

  if (latLngs.length < 2) return null;

  const baseStyle = getRouteStyle(profile, isSelected);
  const congestionSegments = isSelected
    ? buildCongestionSegments(latLngs, trafficSamples)
    : null;

  // When we have per-segment traffic and this is the selected route, render
  // colored sub-polylines. Otherwise fall back to single-color polyline.
  if (congestionSegments) {
    return (
      <>
        {/* Faint base layer for continuity */}
        <Polyline
          positions={latLngs}
          pathOptions={{ ...baseStyle, weight: 8, opacity: 0.25 }}
        />
        {congestionSegments.map((seg, i) => (
          <Polyline
            key={`${seg.level}-${i}`}
            positions={seg.coords}
            pathOptions={{
              color: seg.color,
              weight: 7,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}
      </>
    );
  }

  return (
    <Polyline
      positions={latLngs}
      pathOptions={{
        ...baseStyle,
        weight:    isSelected ? 7 : 4,
        opacity:   isSelected ? 0.95 : 0.45,
        dashArray: isAlternative && !isSelected ? '10,6' : undefined,
      }}
    />
  );
};

export default RouteLayer;
