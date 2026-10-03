import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, UsersRound, MapPin, Phone, Inbox } from 'lucide-react-native';
import { api } from '../lib/api';
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
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  pickup_stop_id: string | null;
  status: string;
}

interface Stop {
  id: string;
  name: string;
  route_id: string | null;
}

export default function RosterScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [studentsRes, stopsRes, routesRes] = await Promise.all([
        api.get<{ items: Student[] }>('/students?limit=300'),
        api.get<{ items: Stop[] }>('/stops?limit=300'),
        api.get<{ items: { id: string; name: string }[] }>('/routes?limit=100'),
      ]);
      setStudents(studentsRes.items ?? []);
      setStops(stopsRes.items ?? []);
      const map: Record<string, string> = {};
      for (const r of routesRes.items ?? []) map[r.id] = r.name;
      setRoutes(map);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stopName = useCallback(
    (id: string | null) => (id ? stops.find((s) => s.id === id)?.name ?? null : null),
    [stops]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.first_name, s.last_name, s.student_id, s.class_name, s.father_name, s.mother_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [students, query]);

  const grouped = useMemo(() => {
    const byClass = new Map<string, Student[]>();
    for (const s of filtered) {
      const key = [s.class_name, s.section].filter(Boolean).join(' ') || 'Unassigned';
      if (!byClass.has(key)) byClass.set(key, []);
      byClass.get(key)!.push(s);
    }
    return Array.from(byClass.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

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
        title="Roster"
        subtitle={`${students.length} student${students.length === 1 ? '' : 's'} enrolled`}
      />

      <View style={styles.searchWrap}>
        <Search size={17} color={colors.textMuted} strokeWidth={2.2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, class or ID"
          placeholderTextColor={colors.tabInactive}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ErrorBanner message={error} onRetry={load} />

      {students.length === 0 ? (
        <EmptyState
          icon={<Inbox size={26} color={colors.primary} strokeWidth={1.8} />}
          title="No students yet"
          text="The roster fills up as soon as students are enrolled from the dashboard."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={26} color={colors.primary} strokeWidth={1.8} />}
          title="No matches"
          text={`Nothing matches “${query.trim()}”. Try a different name or class.`}
        />
      ) : (
        grouped.map(([className, list]) => (
          <View key={className} style={styles.section}>
            <Text style={styles.sectionLabel}>
              {className} · {list.length}
            </Text>
            {list.map((s) => {
              const parentPhone = s.father_phone || s.mother_phone;
              const routeName = s.route_id ? routes[s.route_id] : null;
              const stop = stopName(s.pickup_stop_id);
              return (
                <View key={s.id} style={[styles.card, shadow]}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {s.first_name?.[0] ?? '?'}
                        {s.last_name?.[0] ?? ''}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>
                        {s.first_name} {s.last_name}
                      </Text>
                      <Text style={styles.meta}>{s.student_id}</Text>
                    </View>
                  </View>
                  {routeName || stop ? (
                    <View style={styles.tagRow}>
                      {routeName ? (
                        <View style={styles.tag}>
                          <MapPin size={12} color={colors.primary} strokeWidth={2.4} />
                          <Text style={styles.tagText}>
                            {routeName}
                            {stop ? ` · ${stop}` : ''}
                          </Text>
                        </View>
                      ) : null}
                      {parentPhone ? (
                        <View style={styles.tag}>
                          <Phone size={12} color={colors.textMuted} strokeWidth={2.4} />
                          <Text style={[styles.tagText, { color: colors.textMuted }]}>{parentPhone}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 0 },
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
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
});
