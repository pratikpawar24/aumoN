import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { colors } from '../../theme/theme';

// Free, key-free map: OpenStreetMap tiles rendered with Leaflet inside a
// WebView — same stack as the AumoN web app, no Google Maps key required.
// RN drives it by injecting `window.AUMO.update(data)`; the page posts back
// `ready` and `routeTap` events.
const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;background:#0f172a}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:true}).setView([19.076,72.8777],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'(c) OpenStreetMap'}).addTo(map);
var routeLayer=L.layerGroup().addTo(map), markerLayer=L.layerGroup().addTo(map);
var lastFit=null, lastCenter=null;
function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
window.AUMO={ update:function(d){
  routeLayer.clearLayers(); markerLayer.clearLayers();
  (d.routes||[]).forEach(function(r){
    if(!r.coords||r.coords.length<2)return;
    var pl=L.polyline(r.coords,{color:r.selected?r.color:'#94a3b8',weight:r.selected?6:3,opacity:r.selected?0.95:0.5,dashArray:r.selected?null:'8,6'});
    pl.on('click',function(){ send({type:'routeTap',index:r.index}); });
    routeLayer.addLayer(pl);
  });
  if(d.origin) markerLayer.addLayer(L.circleMarker([d.origin.lat,d.origin.lng],{radius:8,color:'#fff',weight:2,fillColor:'#22c55e',fillOpacity:1}));
  if(d.destination) markerLayer.addLayer(L.circleMarker([d.destination.lat,d.destination.lng],{radius:8,color:'#fff',weight:2,fillColor:'#ef4444',fillOpacity:1}));
  if(d.user) markerLayer.addLayer(L.circleMarker([d.user.lat,d.user.lng],{radius:7,color:'#fff',weight:3,fillColor:'#3b82f6',fillOpacity:1}));
  var sel=(d.routes||[]).filter(function(r){return r.selected;})[0]||(d.routes||[])[0];
  if(d.fitToken!=null && d.fitToken!==lastFit && sel && sel.coords && sel.coords.length>1){
    lastFit=d.fitToken; map.fitBounds(L.latLngBounds(sel.coords),{padding:[50,50]});
  } else if(d.centerToken!=null && d.centerToken!==lastCenter && d.user){
    lastCenter=d.centerToken; map.setView([d.user.lat,d.user.lng],14);
  } else if(d.follow && d.user){
    map.panTo([d.user.lat,d.user.lng]);
  }
}};
send({type:'ready'});
</script></body></html>`;

const toCoords = (geometry = []) =>
  geometry.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.lat, p.lng]));

const LeafletMap = ({ routes = [], selected = 0, origin, destination, user, fitToken = 0, centerToken = 0, follow = false, onSelectRoute }) => {
  const ref = useRef(null);
  const ready = useRef(false);

  const data = useMemo(() => ({
    routes: routes.map((r, i) => ({
      index: i,
      selected: i === selected,
      color: r.color || colors.primary,
      coords: toCoords(r.route_geometry),
    })),
    origin: origin ? { lat: origin.lat, lng: origin.lng } : null,
    destination: destination ? { lat: destination.lat, lng: destination.lng } : null,
    user: user ? { lat: user.lat, lng: user.lng } : null,
    fitToken, centerToken, follow,
  }), [routes, selected, origin, destination, user, fitToken, centerToken, follow]);

  const push = useCallback(() => {
    ref.current?.injectJavaScript(`window.AUMO && window.AUMO.update(${JSON.stringify(data)}); true;`);
  }, [data]);

  useEffect(() => { if (ready.current) push(); }, [push]);

  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') { ready.current = true; push(); }
      else if (m.type === 'routeTap') onSelectRoute?.(m.index);
    } catch (_) { /* ignore */ }
  };

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html: HTML }}
      onMessage={onMessage}
      style={{ flex: 1, backgroundColor: colors.bg }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
    />
  );
};

export default LeafletMap;
