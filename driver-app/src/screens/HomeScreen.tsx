import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [tripStatus, setTripStatus] = useState<'idle' | 'active' | 'completed'>('idle');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const startTrip = () => {
    setIsTracking(true);
    setTripStatus('active');
  };

  const endTrip = () => {
    setIsTracking(false);
    setTripStatus('completed');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Route</Text>
        <Text style={styles.subtitle}>Route 1 - Morning Pickup</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trip Status</Text>
        <View style={[styles.statusBadge, tripStatus === 'active' && styles.statusActive]}>
          <Text style={styles.statusText}>
            {tripStatus === 'idle' ? 'Not Started' : tripStatus === 'active' ? 'In Progress' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Location</Text>
        {location ? (
          <Text style={styles.locationText}>
            Lat: {location.coords.latitude.toFixed(6)}, Lng: {location.coords.longitude.toFixed          {'\n'}Speed: {location.coords.speed?.toFixed(1) || '0'} km/h
          </Text>
        ) : (
          <Text style={styles.locationText}>Getting location...</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stops</Text>
        {['Stop A - Main Gate', 'Stop B - Park Road', 'Stop C - School'].map((stop, i) => (
          <View key={i} style={styles.stopItem}>
            <Text style={styles.stopNumber}>{i + 1}</Text>
            <Text style={styles.stopName}>{stop}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, tripStatus === 'active' && styles.endButton]}
        onPress={tripStatus === 'active' ? endTrip : startTrip}
      >
        <Text style={styles.actionButtonText}>
          {tripStatus === 'active' ? 'End Trip' : 'Start Trip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  statusActive: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  locationText: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  stopItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  stopNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e7ff', textAlign: 'center', lineHeight: 28, fontSize: 12, fontWeight: '600', color: '#6366f1', marginRight: 12 },
  stopName: { fontSize: 14, color: '#1e293b' },
  actionButton: { backgroundColor: '#10b981', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  endButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
