import React, { useEffect } from 'react';
import { Polyline, useMap } from 'react-leaflet';
import { getRouteStyle, fitMapToRoute } from '../../utils/mapUtils';

const RouteLayer = ({ route, isSelected = false, isAlternative = false }) => {
  const map = useMap();

  const geometry = route?.route_geometry || route?.routeGeometry || [];
  const profile  = route?.profile || 'balanced';

  const latLngs = geometry
    .map((pt) => {
      if (Array.isArray(pt)) return [pt[0], pt[1]];
      if (pt && pt.lat !== undefined) return [pt.lat, pt.lng];
      return null;
    })
    .filter(Boolean);

  useEffect(() => {
    if (isSelected && latLngs.length >= 2) {
      fitMapToRoute(map, latLngs);
    }
  }, [isSelected, map]); // eslint-disable-line react-hooks/exhaustive-deps

  if (latLngs.length < 2) return null;

  const style = getRouteStyle(profile, isSelected);

  return (
    <Polyline
      positions={latLngs}
      pathOptions={{
        ...style,
        weight:    isSelected ? 7 : 4,
        opacity:   isSelected ? 0.95 : 0.45,
        dashArray: isAlternative && !isSelected ? '10,6' : undefined,
      }}
    />
  );
};

export default RouteLayer;