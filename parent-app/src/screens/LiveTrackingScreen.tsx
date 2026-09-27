import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function LiveTrackingScreen() {
  const [busLocation, setBusLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [eta, setEta] = useState(12);
  const [speed, setSpeed] = useState(35);

  useEffect(() => {
    const interval = setInterval(() => {
      setBusLocation(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }));
      setEta(prev => Math.max(1, prev - 1));
      setSpeed(30 + Math.floor(Math.random() * 20));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Tracking</Text>
        <Text style={styles.subtitle}>BUS-001 - Route 1</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>📍</Text>
        <Text style={styles.mapText}>Live Map View</Text>
        <Text style={styles.mapCoords}>
          {busLocation.lat.toFixed(4)}, {busLocation.lng.toFixed(4)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bus Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{eta} min</Text>
            <Text style={styles.statusLabel}>ETA to Stop A</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{speed} km/h</Text>
            <Text style={styles.statusLabel}>Current Speed</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route Progress</Text>
        {['Stop A - Main Gate', 'Stop B - Park Road', 'Stop C - School'].map((stop, i) => (
          <View key={i} style={styles.stopItem}>
            <View style={[styles.stopDot, i === 0 && styles.stopDotActive]} />
            <Text style={styles.stopName}>{stop}</Text>
            {i === 0 && <Text style={styles.stopETA}>{eta} min</Text>}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver Info</Text>
        <Text style={styles.driverName}>Ramesh Kumar</Text>
        <Text style={styles.driverPhone}>+91 98765 43210</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  mapPlaceholder: { height: 200, backgroundColor: '#e2e8f0', margin: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mapIcon: { fontSize: 48 },
  mapText: { fontSize: 16, color: '#64748b', marginTop: 8 },
  mapCoords: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 16, marginTop: 0, padding: 16, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center' },
  statusValue: { fontSize: 24, fontWeight: 'bold', color: '#6366f1' },
  statusLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  stopItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stopDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1', marginRight: 12 },
  stopDotActive: { backgroundColor: '#10b981' },
  stopName: { flex: 1, fontSize: 14, color: '#1e293b' },
  stopETA: { fontSize: 12, color: '#6366f1', fontWeight: '500' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  driverPhone: { fontSize: 14, color: '#64748b', marginTop: 4 },
});
