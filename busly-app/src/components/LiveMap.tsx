import React, { useMemo, useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

export interface MapStop {
  latitude: number;
  longitude: number;
  name: string;
  stop_order: number;
}

export interface MapBus {
  latitude: number;
  longitude: number;
  label: string;
}

interface Props {
  stops: MapStop[];
  bus: MapBus | null;
  height?: number;
}

const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// Leaflet renders tiles with the phone's browser engine, so what works in
// the phone browser works here too (no native tile bridge involved).
function buildHtml(stops: MapStop[], bus: MapBus | null): string {
  const stopsJson = JSON.stringify(
    stops.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
  );
  const busJson = JSON.stringify(bus);
  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{height:100%;margin:0;padding:0;background:#e8eef4;}
.bus-pin{width:34px;height:34px;border-radius:50%;background:#4F46E5;border:3px solid #fff;
display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 6px rgba(0,0,0,.35);}
.stop-pin{min-width:24px;height:24px;border-radius:12px;background:#fff;border:2px solid #4F46E5;
color:#4F46E5;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;
padding:0 5px;box-shadow:0 1px 4px rgba(0,0,0,.3);font-family:sans-serif;}
</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: true });
L.tileLayer('${ESRI_URL}', { maxZoom: 19, attribution: 'Powered by Esri' }).addTo(map);
var stops = ${stopsJson};
var pts = [];
stops.forEach(function(s){
  pts.push([s.latitude, s.longitude]);
  L.marker([s.latitude, s.longitude], {
    icon: L.divIcon({ className: '', html: '<div class="stop-pin">' + s.stop_order + '</div>', iconSize: [24, 24], iconAnchor: [12, 12] })
  }).bindTooltip(s.name).addTo(map);
});
if (stops.length > 1) L.polyline(pts, { color: '#4F46E5', weight: 4 }).addTo(map);
var busMarker = null;
function placeBus(lat, lng, label){
  if (!busMarker) {
    busMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="bus-pin">\\uD83D\\uDE8C</div>', iconSize: [34, 34], iconAnchor: [17, 17] })
    }).addTo(map);
  } else { busMarker.setLatLng([lat, lng]); }
  if (label) busMarker.bindTooltip(label);
  pts.push([lat, lng]);
}
var initialBus = ${busJson};
if (initialBus) placeBus(initialBus.latitude, initialBus.longitude, initialBus.label);
if (pts.length) map.fitBounds(pts, { padding: [30, 30] });
else map.setView([19.07, 72.87], 12);
window.__updateBus = function(lat, lng, label){ placeBus(lat, lng, label); };
</script></body></html>`;
}

export default function LiveMap({ stops, bus, height = 260 }: Props) {
  const webRef = useRef<WebView>(null);
  const sig = useMemo(
    () => JSON.stringify(stops.map((s) => [s.latitude, s.longitude, s.name, s.stop_order])),
    [stops]
  );
  const html = useMemo(
    () => buildHtml(stops, bus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig]
  );

  // Live bus moves without reloading the page.
  useEffect(() => {
    if (bus && Number.isFinite(bus.latitude) && Number.isFinite(bus.longitude)) {
      const label = JSON.stringify(bus.label ?? 'Bus');
      webRef.current?.injectJavaScript(
        `window.__updateBus && window.__updateBus(${bus.latitude}, ${bus.longitude}, ${label});true;`
      );
    }
  }, [bus?.latitude, bus?.longitude]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://busly.app' }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: '#e8eef4' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8eef4',
  },
});
