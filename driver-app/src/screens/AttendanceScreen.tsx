import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

const students = [
  { id: '1', name: 'Arjun Kumar', class: '5A', stop: 'Stop A', status: 'pending' },
  { id: '2', name: 'Priya Singh', class: '5A', stop: 'Stop A', status: 'pending' },
  { id: '3', name: 'Rahul Sharma', class: '5B', stop: 'Stop B', status: 'pending' },
  { id: '4', name: 'Sneha Patel', class: '5B', stop: 'Stop B', status: 'pending' },
  { id: '5', name: 'Amit Verma', class: '6A', stop: 'Stop C', status: 'pending' },
];

export default function AttendanceScreen() {
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  const markAttendance = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = () => {
    const marked = Object.keys(attendance).length;
    if (marked < students.length) {
      Alert.alert('Incomplete', 'Please mark attendance for all students.');
      return;
    }
    Alert.alert('Success', 'Attendance submitted successfully!');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip Attendance</Text>
        <Text style={styles.subtitle}>Morning Pickup - Route 1</Text>
      </View>

      {students.map((student) => (
        <View key={student.id} style={styles.card}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentClass}>Class {student.class} - {student.stop}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.presentButton, attendance[student.id] === 'present' && styles.activeButton]}
              onPress={() => markAttendance(student.id, 'present')}
            >
              <Text style={styles.buttonText}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.absentButton, attendance[student.id] === 'absent' && styles.activeButton]}
              onPress={() => markAttendance(student.id, 'absent')}
            >
              <Text style={styles.buttonText}>Absent</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Attendance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#6366f1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 16, marginBottom: 8, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  studentClass: { fontSize: 12, color: '#64748b', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  presentButton: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  absentButton: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  activeButton: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  buttonText: { fontSize: 12, fontWeight: '500', color: '#1e293b' },
  submitButton: { backgroundColor: '#6366f1', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
