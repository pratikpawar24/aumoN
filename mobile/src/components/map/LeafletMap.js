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
<style>html,body,#map{height:100%;margin:0;background:#e8eaed}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:true}).setView([19.076,72.8777],11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,attribution:'(c) OpenStreetMap, (c) CARTO'}).addTo(map);
map.on('click',function(e){ send({type:'mapTap',lat:e.latlng.lat,lng:e.latlng.lng}); });
var routeLayer=L.layerGroup().addTo(map), markerLayer=L.layerGroup().addTo(map);
var lastFit=null, lastCenter=null;
function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
window.AUMO={ update:function(d){
  routeLayer.clearLayers(); markerLayer.clearLayers();
  (d.routes||[]).forEach(function(r){
    if(!r.coords||r.coords.length<2)return;
    if(r.selected){
      routeLayer.addLayer(L.polyline(r.coords,{color:'#1967d2',weight:9,opacity:0.95}));
      var core=L.polyline(r.coords,{color:'#4285F4',weight:6,opacity:1});
      core.on('click',function(){ send({type:'routeTap',index:r.index}); });
      routeLayer.addLayer(core);
    } else {
      var alt=L.polyline(r.coords,{color:'#9aa0a6',weight:4,opacity:0.7,dashArray:'6,8'});
      alt.on('click',function(){ send({type:'routeTap',index:r.index}); });
      routeLayer.addLayer(alt);
    }
  });
  function pin(color){ return L.divIcon({className:'',iconSize:[26,38],iconAnchor:[13,38],
    html:'<svg width="26" height="38" viewBox="0 0 26 38"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="'+color+'"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>'}); }
  if(d.origin) markerLayer.addLayer(L.marker([d.origin.lat,d.origin.lng],{icon:pin('#1a73e8')}));
  if(d.destination) markerLayer.addLayer(L.marker([d.destination.lat,d.destination.lng],{icon:pin('#ea4335')}));
  if(d.user){
    markerLayer.addLayer(L.circleMarker([d.user.lat,d.user.lng],{radius:30,stroke:false,fillColor:'#4285F4',fillOpacity:0.15}));
    markerLayer.addLayer(L.circleMarker([d.user.lat,d.user.lng],{radius:7,color:'#fff',weight:3,fillColor:'#4285F4',fillOpacity:1}));
  }
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

const LeafletMap = ({ routes = [], selected = 0, origin, destination, user, fitToken = 0, centerToken = 0, follow = false, onSelectRoute, onMapTap }) => {
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
      else if (m.type === 'mapTap') onMapTap?.({ lat: m.lat, lng: m.lng });
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
