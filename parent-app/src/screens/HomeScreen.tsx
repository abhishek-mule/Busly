import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Children</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.childHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View>
            <Text style={styles.childName}>Arjun Kumar</Text>
            <Text style={styles.childClass}>Class 5A</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Bus</Text>
          <Text style={styles.value}>BUS-001</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>Route 1 - Morning</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>7:00 AM - Stop A</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Drop</Text>
          <Text style={styles.value}>4:00 PM - Stop A</Text>
        </View>
        <TouchableOpacity style={styles.trackButton}>
          <Text style={styles.trackButtonText}>Track Live Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.childHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <View>
            <Text style={styles.childName}>Priya Singh</Text>
            <Text style={styles.childClass}>Class 3B</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Bus</Text>
          <Text style={styles.value}>BUS-002</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>Route 2 - Morning</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>7:15 AM - Stop C</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Drop</Text>
          <Text style={styles.value}>4:15 PM - Stop C</Text>
        </View>
        <TouchableOpacity style={styles.trackButton}>
          <Text style={styles.trackButtonText}>Track Live Location</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#6366f1' },
  childName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  childClass: { fontSize: 14, color: '#64748b', marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  trackButton: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  trackButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
