import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const attendanceData = [
  { date: '2024-01-15', trip: 'Pickup', status: 'Present', time: '7:05 AM' },
  { date: '2024-01-15', trip: 'Drop', status: 'Present', time: '4:10 PM' },
  { date: '2024-01-14', trip: 'Pickup', status: 'Present', time: '7:03 AM' },
  { date: '2024-01-14', trip: 'Drop', status: 'Present', time: '4:08 PM' },
  { date: '2024-01-13', trip: 'Pickup', status: 'Absent', time: '-' },
  { date: '2024-01-13', trip: 'Drop', status: 'Present', time: '4:05 PM' },
  { date: '2024-01-12', trip: 'Pickup', status: 'Present', time: '7:02 AM' },
  { date: '2024-01-12', trip: 'Drop', status: 'Present', time: '4:12 PM' },
];

export default function AttendanceScreen() {
  const [selectedChild, setSelectedChild] = useState('Arjun');

  const presentCount = attendanceData.filter(a => a.status === 'Present').length;
  const totalCount = attendanceData.length;
  const attendanceRate = Math.round((presentCount / totalCount) * 100);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.childName}>Arjun Kumar</Text>
        <Text style={styles.attendanceRate}>{attendanceRate}% Attendance Rate</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${attendanceRate}%` }]} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        {attendanceData.map((record, i) => (
          <View key={i} style={styles.recordItem}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordDate}>{record.date}</Text>
              <Text style={styles.recordTrip}>{record.trip} - {record.time}</Text>
            </View>
            <View style={[styles.statusBadge, record.status === 'Present' ? styles.presentBadge : styles.absentBadge]}>
              <Text style={styles.statusText}>{record.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  childName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  attendanceRate: { fontSize: 14, color: '#64748b', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  recordInfo: { flex: 1 },
  recordDate: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  recordTrip: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  presentBadge: { backgroundColor: '#dcfce7' },
  absentBadge: { backgroundColor: '#fef2f2' },
  statusText: { fontSize: 12, fontWeight: '500', color: '#1e293b' },
});
