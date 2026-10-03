import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Navigation,
  Play,
  Square,
  Clock,
  Route as RouteIcon,
  Users,
  CircleAlert,
  CircleCheck,
  CalendarClock,
  Bus,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../theme';
import { ErrorBanner, EmptyState } from '../components/Feedback';

interface Trip {
  id: string;
  route_id: string;
  vehicle_id: string;
  trip_type: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  students_count: number;
}

interface Stop {
  id: string;
  name: string;
  address: string | null;
  stop_order: number;
  estimated_arrival_time: string | null;
}

interface RouteInfo {
  id: string;
  name: string;
  route_code: string | null;
  start_point: string | null;
  end_point: string | null;
  estimated_time_minutes: number;
}

const today = () => new Date().toISOString().slice(0, 10);

const fmtTime = (iso: string | null) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16) || '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusLabel = (s: string) =>
  s === 'in_progress' ? 'In progress' : s === 'completed' ? 'Completed' : 'Scheduled';

export default function HomeScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [upcomingMode, setUpcomingMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const selected = trips.find((t) => t.id === selectedId) ?? null;
  const activeTrip = trips.find((t) => t.status === 'in_progress') ?? null;
  const current = activeTrip ?? selected;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.get<{ items: Trip[] }>(`/trips?date=${today()}&limit=50`);
      let items = res.items ?? [];
      let upcoming = false;
      if (items.length === 0) {
        const fallback = await api.get<{ items: Trip[] }>('/trips?limit=20');
        items = (fallback.items ?? []).filter((t) => t.status !== 'completed');
        upcoming = items.length > 0;
      }
      setUpcomingMode(upcoming);
      setTrips(items);
      setSelectedId((prev) => {
        if (prev && items.some((t) => t.id === prev)) return prev;
        const preferred =
          items.find((t) => t.status === 'in_progress') ?? items.find((t) => t.status === 'scheduled');
        return preferred?.id ?? null;
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not load today’s trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setRoute(null);
    setStops([]);
    if (!current?.route_id) return;
    (async () => {
      try {
        const [r, s] = await Promise.all([
          api.get<RouteInfo>(`/routes/${current.route_id}`),
          api.get<{ items: Stop[] }>(`/routes/${current.route_id}/stops`),
        ]);
        if (cancelled) return;
        setRoute(r);
        setStops(s.items ?? []);
      } catch {
        if (!cancelled) setStops([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.route_id]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocDenied(true);
        return;
      }
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 15 },
        (loc) => setLocation(loc)
      );
    })();
    return () => {
      locationSub.current?.remove();
      locationSub.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeTrip?.vehicle_id || !location) return;
    let cancelled = false;
    const push = async () => {
      if (cancelled || !location) return;
      try {
        await api.post('/gps/location', {
          vehicle_id: activeTrip.vehicle_id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed ?? 0,
          heading: location.coords.heading ?? 0,
          accuracy: location.coords.accuracy ?? 0,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // best-effort telemetry, ignore failures
      }
    };
    push();
    const timer = setInterval(push, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTrip?.id, activeTrip?.vehicle_id, location]);

  const setTripStatus = (id: string, status: string) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const startTrip = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api.post(`/trips/${current.id}/start`);
      setTripStatus(current.id, 'in_progress');
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start the trip.');
    } finally {
      setBusy(false);
    }
  };

  const completeTrip = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api.post(`/trips/${current.id}/complete`);
      setTripStatus(current.id, 'completed');
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not complete the trip.');
    } finally {
      setBusy(false);
    }
  };

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const greeting =
    new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

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
            load(true);
          }}
          tintColor={colors.primary}
        />
      }
    >
      <LinearGradient
        colors={[colors.primary, '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.greeting}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Bus size={14} color={colors.white} strokeWidth={2.2} />
          <Text style={styles.headerBadgeText}>
            {upcomingMode
              ? `${trips.length} upcoming ${trips.length === 1 ? 'trip' : 'trips'}`
              : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} today`}
          </Text>
        </View>
      </LinearGradient>

      <ErrorBanner message={error} onRetry={() => load()} />

      {trips.length === 0 && !error ? (
        <EmptyState
          icon={<CalendarClock size={26} color={colors.primary} strokeWidth={1.8} />}
          title="No trips scheduled"
          text="There are no routes assigned for today. Pull down to refresh."
        />
      ) : null}

      {upcomingMode && trips.length > 0 ? (
        <View style={styles.upcomingNote}>
          <CalendarClock size={15} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.upcomingNoteText}>
            No trips scheduled for today — showing your upcoming trips.
          </Text>
        </View>
      ) : null}

      {trips.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripStrip}>
          {trips.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tripChip, current?.id === t.id && styles.tripChipActive]}
              onPress={() => setSelectedId(t.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tripChipText, current?.id === t.id && styles.tripChipTextActive]}>
                {upcomingMode && t.scheduled_start_time
                  ? `${new Date(t.scheduled_start_time).toLocaleDateString([], { day: 'numeric', month: 'short' })} · `
                  : ''}
                {t.trip_type === 'drop' || t.trip_type === 'dropoff' ? 'Drop-off' : 'Pickup'} · {fmtTime(t.scheduled_start_time)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {current ? (
        <View style={[styles.card, shadow]}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeName}>{route?.name ?? 'Assigned route'}</Text>
              <Text style={styles.routeMeta}>
                {route?.route_code ? `${route.route_code} · ` : ''}
                {current.trip_type === 'drop' || current.trip_type === 'dropoff' ? 'Drop-off' : 'Pickup'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                current.status === 'in_progress' && styles.statusPillActive,
                current.status === 'completed' && styles.statusPillDone,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  current.status === 'in_progress' && styles.statusPillTextActive,
                  current.status === 'completed' && styles.statusPillTextDone,
                ]}
              >
                {statusLabel(current.status)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{fmtTime(current.scheduled_start_time)}</Text>
            </View>
            {upcomingMode && current.scheduled_start_time ? (
              <View style={styles.metaItem}>
                <CalendarClock size={15} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.metaText}>
                  {new Date(current.scheduled_start_time).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <RouteIcon size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>
                {route?.estimated_time_minutes ? `${route.estimated_time_minutes} min` : 'Route set'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{current.students_count || 0} students</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              current.status === 'in_progress' && styles.actionButtonStop,
              current.status === 'completed' && styles.actionButtonDone,
            ]}
            onPress={current.status === 'in_progress' ? completeTrip : startTrip}
            disabled={busy || current.status === 'completed'}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : current.status === 'in_progress' ? (
              <>
                <Square size={16} color={colors.white} strokeWidth={2.6} fill={colors.white} />
                <Text style={styles.actionButtonText}>End Trip</Text>
              </>
            ) : current.status === 'completed' ? (
              <>
                <CircleCheck size={16} color={colors.white} strokeWidth={2.4} />
                <Text style={styles.actionButtonText}>Trip Completed</Text>
              </>
            ) : (
              <>
                <Play size={16} color={colors.white} strokeWidth={2.6} fill={colors.white} />
                <Text style={styles.actionButtonText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.card, shadow]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>Current location</Text>
          {current?.status === 'in_progress' ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>Live</Text>
            </View>
          ) : null}
        </View>
        {locDenied ? (
          <View style={styles.inlineNote}>
            <CircleAlert size={15} color={colors.warning} strokeWidth={2.2} />
            <Text style={styles.inlineNoteText}>
              Location permission is off. Enable it to share live position during trips.
            </Text>
          </View>
        ) : location ? (
          <>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Navigation size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationCoord}>
                  {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
                </Text>
                <Text style={styles.locationMeta}>
                  {Math.round(location.coords.accuracy ?? 0)} m accuracy
                  {location.coords.speed != null && location.coords.speed > 0
                    ? ` · ${Math.round(location.coords.speed * 3.6)} km/h`
                    : ''}
                </Text>
              </View>
            </View>
            {current?.status === 'in_progress' && !current.vehicle_id ? (
              <View style={styles.inlineNote}>
                <CircleAlert size={15} color={colors.warning} strokeWidth={2.2} />
                <Text style={styles.inlineNoteText}>
                  No vehicle assigned to this trip — live tracking is unavailable.
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.locationRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.locationMeta, { marginLeft: 10 }]}>Acquiring GPS fix…</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>Stops</Text>
        {stops.length === 0 ? (
          <View style={styles.inlineNote}>
            <MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.inlineNoteTextMuted}>
              No stops found for this route. Stops appear here once they are configured.
            </Text>
          </View>
        ) : (
          stops.map((stop, i) => (
            <View key={stop.id} style={[styles.stopItem, i === stops.length - 1 && styles.stopItemLast]}>
              <View style={styles.stopNumber}>
                {i === stops.length - 1 ? (
                  <MapPin size={14} color={colors.primary} strokeWidth={2.4} />
                ) : (
                  <Text style={styles.stopNumberText}>{stop.stop_order}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{stop.name}</Text>
                {stop.address ? <Text style={styles.stopAddress}>{stop.address}</Text> : null}
              </View>
              {stop.estimated_arrival_time ? (
                <Text style={styles.stopTime}>{String(stop.estimated_arrival_time).slice(0, 5)}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  greeting: { color: colors.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerDate: { color: '#C7D2FE', fontSize: 13, marginTop: 4, fontWeight: '500' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  headerBadgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  tripStrip: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  upcomingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  upcomingNoteText: { fontSize: 12.5, color: colors.primaryDark, fontWeight: '600', flex: 1 },
  tripChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },
  tripChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tripChipTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    padding: 18,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  routeName: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  routeMeta: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontWeight: '500' },
  statusPill: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  statusPillActive: { backgroundColor: colors.primarySoft },
  statusPillDone: { backgroundColor: colors.successSoft },
  statusPillText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  statusPillTextActive: { color: colors.primary },
  statusPillTextDone: { color: colors.success },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    height: 50,
    marginTop: 16,
  },
  actionButtonStop: { backgroundColor: colors.danger },
  actionButtonDone: { backgroundColor: colors.tabInactive },
  actionButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  livePillText: { fontSize: 11, fontWeight: '800', color: colors.success, letterSpacing: 0.4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCoord: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  locationMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  inlineNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  inlineNoteText: { fontSize: 12.5, color: colors.warning, flex: 1, lineHeight: 18, fontWeight: '500' },
  inlineNoteTextMuted: { fontSize: 12.5, color: colors.textMuted, flex: 1, lineHeight: 18 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopItemLast: { borderBottomWidth: 0, paddingBottom: 2 },
  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  stopName: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  stopAddress: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  stopTime: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
