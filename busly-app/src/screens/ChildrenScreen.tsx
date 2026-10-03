import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Baby,
  MapPin,
  Inbox,
  CalendarDays,
  CircleCheck,
  CircleMinus,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { normalizePhone, fmtDate } from '../lib/format';
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
  pickup_stop_id: string | null;
  father_phone: string | null;
  mother_phone: string | null;
}

interface RouteInfo {
  id: string;
  name: string;
}

interface Stop {
  id: string;
  name: string;
}

interface AttendanceRow {
  id: string;
  student_id: string;
  date: string;
  trip_type: string;
  status: string;
}

export default function ChildrenScreen() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [stops, setStops] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const phone = normalizePhone(user?.phone);
      const [studentsRes, routesRes, stopsRes, attendanceRes] = await Promise.all([
        api.get<{ items: Student[] }>('/students?limit=300'),
        api.get<{ items: RouteInfo[] }>('/routes?limit=100'),
        api.get<{ items: Stop[] }>('/stops?limit=300'),
        api.get<{ items: AttendanceRow[] }>('/attendance?limit=300'),
      ]);
      const kids = phone
        ? (studentsRes.items ?? []).filter(
            (s) => normalizePhone(s.father_phone) === phone || normalizePhone(s.mother_phone) === phone
          )
        : [];
      setChildren(kids);
      setSelectedId((prev) => (prev && kids.some((k) => k.id === prev) ? prev : kids[0]?.id ?? null));

      const routeMap: Record<string, string> = {};
      for (const r of routesRes.items ?? []) routeMap[r.id] = r.name;
      setRoutes(routeMap);

      const stopMap: Record<string, string> = {};
      for (const s of stopsRes.items ?? []) stopMap[s.id] = s.name;
      setStops(stopMap);

      setAttendance(attendanceRes.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load your children’s data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.phone]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = children.find((c) => c.id === selectedId) ?? null;

  const history = useMemo(() => {
    if (!selected) return [];
    const rows = attendance.filter((a) => a.student_id === selected.id);
    const byDate = new Map<string, { present: number; absent: number }>();
    for (const r of rows) {
      const key = String(r.date).slice(0, 10);
      const agg = byDate.get(key) ?? { present: 0, absent: 0 };
      if (r.status === 'absent') agg.absent += 1;
      else agg.present += 1;
      byDate.set(key, agg);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 30)
      .map(([date, agg]) => ({
        date,
        status: agg.absent > 0 ? 'absent' : 'present',
      }));
  }, [attendance, selected]);

  const presentCount = history.filter((h) => h.status === 'present').length;

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
      <ScreenHeader
        title="My Children"
        subtitle={
          children.length
            ? `${children.length} linked · ${history.length ? `${presentCount}/${history.length} days present` : 'attendance loads below'}`
            : 'Linked student profiles'
        }
      />

      <ErrorBanner message={error} onRetry={load} />

      {children.length === 0 ? (
        <EmptyState
          icon={<Inbox size={26} color={colors.primary} strokeWidth={1.8} />}
          title="No children linked"
          text="No student record matches your phone number. Ask the school office to add your number to your child's profile."
        />
      ) : (
        <>
          <View style={styles.childStrip}>
            {children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, selectedId === c.id && styles.childChipActive]}
                onPress={() => setSelectedId(c.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.childChipText, selectedId === c.id && styles.childChipTextActive]}>
                  {c.first_name} {c.last_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selected ? (
            <View style={[styles.card, shadow]}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Baby size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>
                    {selected.first_name} {selected.last_name}
                  </Text>
                  <Text style={styles.childMeta}>
                    {[selected.class_name, selected.section].filter(Boolean).join(' · ') || selected.student_id}
                  </Text>
                </View>
              </View>
              <View style={styles.tagRow}>
                {selected.route_id && routes[selected.route_id] ? (
                  <View style={styles.tag}>
                    <MapPin size={12} color={colors.primary} strokeWidth={2.4} />
                    <Text style={styles.tagText}>{routes[selected.route_id]}</Text>
                  </View>
                ) : null}
                {selected.pickup_stop_id && stops[selected.pickup_stop_id] ? (
                  <View style={styles.tag}>
                    <MapPin size={12} color={colors.textMuted} strokeWidth={2.4} />
                    <Text style={[styles.tagText, { color: colors.textMuted }]}>
                      {stops[selected.pickup_stop_id]}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Attendance history</Text>
            {history.length === 0 ? (
              <View style={styles.inlineNote}>
                <CalendarDays size={15} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.inlineNoteText}>
                  No attendance recorded yet. Records appear after the first marked trip.
                </Text>
              </View>
            ) : (
              history.map((h, i) => (
                <View key={h.date} style={[styles.row, i === history.length - 1 && styles.rowLast]}>
                  <Text style={styles.rowDate}>{fmtDate(h.date)}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      h.status === 'present' ? styles.statusPillPresent : styles.statusPillAbsent,
                    ]}
                  >
                    {h.status === 'present' ? (
                      <CircleCheck size={13} color={colors.success} strokeWidth={2.6} />
                    ) : (
                      <CircleMinus size={13} color={colors.danger} strokeWidth={2.6} />
                    )}
                    <Text
                      style={[
                        styles.statusPillText,
                        h.status === 'present' ? styles.statusTextPresent : styles.statusTextAbsent,
                      ]}
                    >
                      {h.status === 'present' ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  childStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  childChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  childChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  childChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  childChipTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    padding: 18,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: { fontSize: 16.5, fontWeight: '800', color: colors.text },
  childMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 11.5, fontWeight: '600', color: colors.primary },
  inlineNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  inlineNoteText: { fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  rowDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statusPillPresent: { backgroundColor: colors.successSoft },
  statusPillAbsent: { backgroundColor: colors.dangerSoft },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  statusTextPresent: { color: colors.success },
  statusTextAbsent: { color: colors.danger },
});
