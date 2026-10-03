import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ClipboardCheck, Check, X, Send, CircleAlert, RefreshCw, Inbox } from 'lucide-react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { todayISO } from '../lib/format';
import { colors, radius, shadow } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { ErrorBanner, EmptyState } from '../components/Feedback';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name: string | null;
  section: string | null;
  route_id: string | null;
}

interface Trip {
  id: string;
  route_id: string;
  trip_type: string;
  status: string;
}

interface MarkedRecord {
  student_id: string;
  status: string;
}

interface Props {
  mode?: 'driver' | 'teacher';
}

export default function AttendanceScreen({ mode = 'driver' }: Props) {
  const { user } = useAuth();
  const isDriver = mode === 'driver';
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>({});
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const dateStr = todayISO();
      if (isDriver) {
        const [tripsRes, markedRes] = await Promise.all([
          api.get<{ items: Trip[] }>(`/trips?date=${dateStr}&limit=50`),
          api.get<{ items: MarkedRecord[] }>(`/attendance/daily?date=${dateStr}`),
        ]);
        const trips = tripsRes.items ?? [];
        const current =
          trips.find((t) => t.status === 'in_progress') ??
          trips.find((t) => t.status === 'scheduled') ??
          trips[0] ??
          null;
        setTrip(current);
        const studentsRes = current?.route_id
          ? await api.get<{ items: Student[] }>(`/students?route_id=${current.route_id}&limit=200`)
          : await api.get<{ items: Student[] }>('/students?limit=200');
        setStudents(studentsRes.items ?? []);
        const preset: Record<string, 'present' | 'absent'> = {};
        for (const rec of markedRes.items ?? []) {
          if (rec.status === 'present' || rec.status === 'absent') preset[rec.student_id] = rec.status;
        }
        setMarks(preset);
      } else {
        const [studentsRes, markedRes] = await Promise.all([
          api.get<{ items: Student[] }>('/students?limit=200'),
          api.get<{ items: MarkedRecord[] }>(`/attendance/daily?date=${dateStr}`),
        ]);
        setTrip(null);
        setStudents(studentsRes.items ?? []);
        const preset: Record<string, 'present' | 'absent'> = {};
        for (const rec of markedRes.items ?? []) {
          if (rec.status === 'present' || rec.status === 'absent') preset[rec.student_id] = rec.status;
        }
        setMarks(preset);
      }
      setSubmitted(false);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load attendance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDriver]);

  useEffect(() => {
    load();
  }, [load]);

  const markedCount = useMemo(() => Object.keys(marks).length, [marks]);

  const setMark = (id: string, status: 'present' | 'absent') => {
    setSubmitted(false);
    setMarks((prev) => ({ ...prev, [id]: status }));
  };

  const handleSubmit = async () => {
    if (students.length === 0) return;
    if (markedCount < students.length) {
      setError('Mark every student before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/attendance/bulk', {
        items: students.map((s) => ({
          student_id: s.id,
          status: marks[s.id],
          date: todayISO(),
          trip_type: isDriver ? (trip?.trip_type === 'drop' ? 'dropoff' : (trip?.trip_type ?? 'pickup')) : 'pickup',
        })),
        trip_id: isDriver ? trip?.id ?? '' : '',
        marked_by: user?.id ?? '',
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = isDriver
    ? trip
      ? `${trip.trip_type === 'drop' || trip.trip_type === 'dropoff' ? 'Drop-off' : 'Pickup'} · ${new Date().toLocaleDateString([], { day: 'numeric', month: 'short' })}`
      : 'No trip today'
    : `Daily roll call · ${new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}`;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <ScreenHeader title="Attendance" subtitle={subtitle}>
        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>
            {markedCount}/{students.length}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${students.length ? (markedCount / students.length) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>
      </ScreenHeader>

      <ErrorBanner message={error} onRetry={load} />

      {students.length === 0 ? (
        <EmptyState
          icon={<Inbox size={26} color={colors.primary} strokeWidth={1.8} />}
          title="No students to mark"
          text="Students appear here once they are added and assigned to a route."
        />
      ) : (
        students.map((student) => {
          const mark = marks[student.id];
          return (
            <View key={student.id} style={[styles.card, shadow]}>
              <View style={styles.studentInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.first_name?.[0] ?? '?'}
                    {student.last_name?.[0] ?? ''}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={styles.studentMeta}>
                    {[student.class_name, student.section].filter(Boolean).join(' · ') || student.student_id}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.markButton, mark === 'present' && styles.presentActive]}
                  onPress={() => setMark(student.id, 'present')}
                  activeOpacity={0.8}
                >
                  <Check size={14} color={mark === 'present' ? colors.white : colors.success} strokeWidth={3} />
                  <Text style={[styles.markText, mark === 'present' && styles.markTextActive]}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.markButton, mark === 'absent' && styles.absentActive]}
                  onPress={() => setMark(student.id, 'absent')}
                  activeOpacity={0.8}
                >
                  <X size={14} color={mark === 'absent' ? colors.white : colors.danger} strokeWidth={3} />
                  <Text style={[styles.markText, mark === 'absent' && styles.markTextActive]}>Absent</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {students.length > 0 ? (
        <TouchableOpacity
          style={[
            styles.submitButton,
            (markedCount < students.length || submitted) && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={markedCount < students.length || submitting || submitted}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : submitted ? (
            <>
              <ClipboardCheck size={17} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.submitText}>Submitted</Text>
            </>
          ) : (
            <>
              <Send size={16} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.submitText}>
                Submit ({markedCount}/{students.length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  progressWrap: { width: 96, alignItems: 'flex-end' },
  progressText: { color: colors.white, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: {
    width: 96,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 7,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.white },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  studentName: { fontSize: 15, fontWeight: '700', color: colors.text },
  studentMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.4,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  presentActive: { backgroundColor: colors.success, borderColor: colors.success },
  absentActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  markText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  markTextActive: { color: colors.white },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 18,
    height: 54,
    borderRadius: radius.md,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
