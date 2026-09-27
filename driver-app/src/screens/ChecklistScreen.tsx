import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

const checklistItems = [
  { id: '1', label: 'Tires - Check pressure and condition', category: 'Exterior' },
  { id: '2', label: 'Brakes - Test brake functionality', category: 'Safety' },
  { id: '3', label: 'Lights - Check all indicators and headlights', category: 'Exterior' },
  { id: '4', label: 'Fuel - Verify sufficient fuel level', category: 'Engine' },
  { id: '5', label: 'First Aid Kit - Verify availability', category: 'Safety' },
  { id: '6', label: 'Fire Extinguisher - Check expiry and pressure', category: 'Safety' },
  { id: '7', label: 'Mirrors - Adjust and clean all mirrors', category: 'Exterior' },
  { id: '8', label: 'Seat Belts - Check all passenger seat belts', category: 'Safety' },
  { id: '9', label: 'Engine Oil - Check oil level', category: 'Engine' },
  { id: '10', label: 'Windshield - Clean and check for cracks', category: 'Exterior' },
];

export default function ChecklistScreen() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const toggleItem = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = () => {
    const allChecked = checklistItems.every(item => checked[item.id]);
    if (!allChecked) {
      Alert.alert('Incomplete', 'Please complete all checklist items before submitting.');
      return;
    }
    setSubmitted(true);
    Alert.alert('Success', 'Checklist submitted successfully!');
  };

  const completedCount = Object.values(checked).filter(Boolean).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pre-Trip Checklist</Text>
        <Text style={styles.subtitle}>{completedCount}/{checklistItems.length} completed</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {checklistItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, checked[item.id] && styles.itemChecked]}
          onPress={() => toggleItem(item.id)}
        >
          <View style={styles.checkbox}>
            {checked[item.id] && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemCategory}>{item.category}</Text>
            <Text style={[styles.itemLabel, checked[item.id] && styles.itemLabelChecked]}>{item.label}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitted}>
        <Text style={styles.submitButtonText}>
          {submitted ? 'Submitted' : 'Submit Checklist'}
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
  progressBar: { height: 4, backgroundColor: '#e2e8f0', margin: 16, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  itemChecked: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  itemContent: { flex: 1 },
  itemCategory: { fontSize: 12, color: '#6366f1', fontWeight: '500', marginBottom: 2 },
  itemLabel: { fontSize: 14, color: '#1e293b' },
  itemLabelChecked: { textDecorationLine: 'line-through', color: '#94a3b8' },
  submitButton: { backgroundColor: '#6366f1', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
