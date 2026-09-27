import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function VehicleScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Vehicle</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.vehicleIcon}>🚌</Text>
        <Text style={styles.vehicleNumber}>BUS-001</Text>
        <Text style={styles.vehicleModel}>Toyota Coaster 2022</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>Bus</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Capacity</Text>
          <Text style={styles.value}>45 seats</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Fuel Level</Text>
          <Text style={styles.value}>75%</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Odometer</Text>
          <Text style={styles.value}>45,230 km</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Insurance Expiry</Text>
          <Text style={styles.value}>Dec 2024</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Permit Expiry</Text>
          <Text style={styles.value}>Jun 2025</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Maintenance</Text>
        <View style={styles.maintenanceItem}>
          <Text style={styles.maintenanceLabel}>Last Service</Text>
          <Text style={styles.maintenanceDate}>15 Jan 2024</Text>
        </View>
        <View style={styles.maintenanceItem}>
          <Text style={styles.maintenanceLabel}>Next Service Due</Text>
          <Text style={styles.maintenanceDate}>15 Apr 2024</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  vehicleIcon: { fontSize: 48, marginBottom: 8 },
  vehicleNumber: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  vehicleModel: { fontSize: 14, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12, alignSelf: 'flex-start' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  maintenanceItem: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8 },
  maintenanceLabel: { fontSize: 14, color: '#64748b' },
  maintenanceDate: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
});
