import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  Bus,
  Navigation,
  MapPin,
  CircleAlert,
  Inbox,
  Clock,
  Gauge,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { normalizePhone, relativeFromNow, fmtTime } from '../lib/format';
import { colors, radius, shadow } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { ErrorBanner, EmptyState } from '../components/Feedback';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  section: string | null;
  route_id: string | null;
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
  latitude: number;
  longitude: number;
  stop_order: number;
}

interface Trip {
  id: string;
  route_id: string;
  vehicle_id: string;
  status: string;
  scheduled_start_time: string | null;
}

interface Vehicle {
  id: string;
  plate_number: string;
}

interface Position {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  recorded_at: string;
}

export default function TrackingScreen({ mode = 'parent' }: { mode?: 'parent' | 'all' }) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const phone = normalizePhone(user?.phone);
      const [studentsRes, routesRes, tripsRes, vehiclesRes, gpsRes] = await Promise.all([
        api.get<{ items: Student[] }>('/students?limit=300'),
        api.get<{ items: RouteInfo[] }>('/routes?limit=100'),
        api.get<{ items: Trip[] }>('/trips?limit=50'),
        api.get<{ items: Vehicle[] }>('/vehicles?limit=50'),
        api.get<{ items: Position[] }>('/gps/active'),
      ]);
      if (!active.current) return;

      const kids =
        mode === 'all'
          ? (studentsRes.items ?? []).filter((s) => s.route_id)
          : phone
            ? (studentsRes.items ?? []).filter(
                (s) => normalizePhone(s.father_phone) === phone || normalizePhone(s.mother_phone) === phone
              )
            : [];
      setChildren(kids);

      const routeMap: Record<string, string> = {};
      for (const r of routesRes.items ?? []) routeMap[r.id] = r.name;
      setRoutes(routeMap);
      setTrips(tripsRes.items ?? []);

      const vehicleMap: Record<string, string> = {};
      for (const v of vehiclesRes.items ?? []) vehicleMap[v.id] = v.plate_number;
      setVehicles(vehicleMap);

      const posMap: Record<string, Position> = {};
      for (const p of gpsRes.items ?? []) posMap[p.vehicle_id] = p;
      setPositions(posMap);

      const childRoutes = Array.from(new Set(kids.map((k) => k.route_id).filter(Boolean))) as string[];
      setSelectedRoute((prev) => (prev && childRoutes.includes(prev) ? prev : childRoutes[0] ?? null));
    } catch (e: any) {
      if (active.current) setError(e?.message ?? 'Could not load live tracking data.');
    } finally {
      if (active.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.phone, mode]);

  const pollGps = useCallback(async () => {
    try {
      const gpsRes = await api.get<{ items: Position[] }>('/gps/active');
      if (!active.current) return;
      const posMap: Record<string, Position> = {};
      for (const p of gpsRes.items ?? []) posMap[p.vehicle_id] = p;
      setPositions(posMap);
    } catch {
      // keep last known positions on transient failures
    }
  }, []);

  useEffect(() => {
    active.current = true;
    load();
    const poll = setInterval(pollGps, 8000);
    return () => {
      active.current = false;
      clearInterval(poll);
    };
  }, [load, pollGps]);

  useEffect(() => {
    let cancelled = false;
    setStops([]);
    if (!selectedRoute) return;
    (async () => {
      try {
        const res = await api.get<{ items: Stop[] }>(`/routes/${selectedRoute}/stops`);
        if (!cancelled && res.items) setStops(res.items);
      } catch {
        if (!cancelled) setStops([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRoute]);

  const routeTrips = useMemo(
    () => trips.filter((t) => t.route_id === selectedRoute),
    [trips, selectedRoute]
  );
  const trip = useMemo(
    () =>
      routeTrips.find((t) => t.status === 'in_progress') ??
      routeTrips.find((t) => t.status === 'scheduled') ??
      routeTrips[0] ??
      null,
    [routeTrips]
  );
  const position = trip?.vehicle_id ? positions[trip.vehicle_id] ?? null : null;
  const plate = trip?.vehicle_id ? vehicles[trip.vehicle_id] ?? null : null;

  const region = useMemo(() => {
    const points: { latitude: number; longitude: number }[] = [
      ...stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
      ...(position ? [{ latitude: position.latitude, longitude: position.longitude }] : []),
    ];
    if (points.length === 0) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const deltaLat = Math.max(Math.max(...lats) - Math.min(...lats), 0.01) * 1.5;
    const deltaLng = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.01) * 1.5;
    return { latitude: midLat, longitude: midLng, latitudeDelta: deltaLat, longitudeDelta: deltaLng };
  }, [stops, position]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const childRoutes = Array.from(new Set(children.map((c) => c.route_id).filter(Boolean))) as string[];

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
      <ScreenHeader
        title="Live Tracking"
        subtitle={
          mode === 'all'
            ? 'All school routes · live'
            : children.length
              ? `${children.map((c) => c.first_name).join(', ')}`
              : 'Real-time bus position'
        }
      />

      <ErrorBanner message={error} onRetry={() => load()} />

      {children.length === 0 ? (
        mode === 'all' ? (
          <EmptyState
            icon={<MapPin size={26} color={colors.primary} strokeWidth={1.8} />}
            title="No routes tracked"
            text="No students are assigned to routes yet. Assign students to routes to see live buses here."
          />
        ) : (
          <EmptyState
            icon={<Inbox size={26} color={colors.primary} strokeWidth={1.8} />}
            title="No children linked"
            text="No student record matches your phone number. Ask the school office to add your number to your child's profile."
          />
        )
      ) : (
        <>
          {childRoutes.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
              {childRoutes.map((rid) => (
                <TouchableOpacity
                  key={rid}
                  style={[styles.chip, selectedRoute === rid && styles.chipActive]}
                  onPress={() => setSelectedRoute(rid)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selectedRoute === rid && styles.chipTextActive]}>
                    {routes[rid] ?? 'Route'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.mapCard, shadow]}>
            {region ? (
              <MapView style={styles.map} initialRegion={region} region={undefined}>
                {stops.map((s) => (
                  <Marker
                    key={s.id}
                    coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                    title={s.name}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.stopDot}>
                      <MapPin size={13} color={colors.primary} strokeWidth={2.6} />
                    </View>
                  </Marker>
                ))}
                {position ? (
                  <Marker
                    coordinate={{ latitude: position.latitude, longitude: position.longitude }}
                    title={plate ?? 'Bus'}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.busMarker}>
                      <Bus size={16} color={colors.white} strokeWidth={2.4} />
                    </View>
                  </Marker>
                ) : null}
                {stops.length > 1 ? (
                  <Polyline
                    coordinates={stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }))}
                    strokeColor={colors.primary}
                    strokeWidth={3}
                  />
                ) : null}
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <MapPin size={28} color={colors.primary} strokeWidth={1.8} />
                <Text style={styles.mapFallbackText}>
                  Route stops will appear on the map once they are configured.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, shadow]}>
            <View style={styles.cardTop}>
              <View style={styles.plateRow}>
                <View style={styles.plateIcon}>
                  <Bus size={17} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.plate}>{plate ?? 'Unassigned vehicle'}</Text>
                  <Text style={styles.plateMeta}>{routes[selectedRoute ?? ''] ?? 'Route'}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusPill,
                  position ? styles.statusPillLive : styles.statusPillIdle,
                ]}
              >
                <View
                  style={[styles.statusDot, position ? styles.statusDotLive : styles.statusDotIdle]}
                />
                <Text style={[styles.statusText, position ? styles.statusTextLive : styles.statusTextIdle]}>
                  {position ? 'Live' : 'No signal'}
                </Text>
              </View>
            </View>

            {position ? (
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Navigation size={15} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.statValue}>
                    {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
                  </Text>
                  <Text style={styles.statLabel}>Position</Text>
                </View>
                <View style={styles.stat}>
                  <Gauge size={15} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.statValue}>{Math.round((position.speed ?? 0) * 3.6)} km/h</Text>
                  <Text style={styles.statLabel}>Speed</Text>
                </View>
                <View style={styles.stat}>
                  <Clock size={15} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.statValue}>{relativeFromNow(position.recorded_at)}</Text>
                  <Text style={styles.statLabel}>Updated</Text>
                </View>
              </View>
            ) : (
              <View style={styles.inlineNote}>
                <CircleAlert size={15} color={colors.warning} strokeWidth={2.2} />
                <Text style={styles.inlineNoteText}>
                  {trip
                    ? 'The bus has not reported its position recently.'
                    : 'No trip is scheduled on this route right now.'}
                </Text>
              </View>
            )}

            {trip ? (
              <View style={styles.tripRow}>
                <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.tripText}>
                  Trip {trip.status === 'in_progress' ? 'in progress' : trip.status} · scheduled{' '}
                  {fmtTime(trip.scheduled_start_time)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Stops</Text>
            {stops.length === 0 ? (
              <View style={styles.inlineNote}>
                <MapPin size={15} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.inlineNoteTextMuted}>No stops configured for this route yet.</Text>
              </View>
            ) : (
              stops.map((stop, i) => (
                <View key={stop.id} style={[styles.stopItem, i === stops.length - 1 && styles.stopItemLast]}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{stop.stop_order}</Text>
                  </View>
                  <Text style={styles.stopName}>{stop.name}</Text>
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
  chipStrip: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  mapCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  map: { height: 260, width: '100%' },
  mapFallback: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  mapFallbackText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  stopDot: {
    backgroundColor: colors.white,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  busMarker: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    padding: 7,
    borderWidth: 2.5,
    borderColor: colors.white,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    padding: 18,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  plateIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: { fontSize: 16, fontWeight: '800', color: colors.text },
  plateMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statusPillLive: { backgroundColor: colors.successSoft },
  statusPillIdle: { backgroundColor: colors.warningSoft },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotLive: { backgroundColor: colors.success },
  statusDotIdle: { backgroundColor: colors.warning },
  statusText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3 },
  statusTextLive: { color: colors.success },
  statusTextIdle: { color: colors.warning },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 8 },
  stat: { alignItems: 'center', flex: 1, gap: 5 },
  statValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  inlineNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  inlineNoteText: { fontSize: 12.5, color: colors.warning, flex: 1, lineHeight: 18, fontWeight: '500' },
  inlineNoteTextMuted: { fontSize: 12.5, color: colors.textMuted, flex: 1, lineHeight: 18 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripText: { fontSize: 12.5, color: colors.textMuted, fontWeight: '500' },
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
  stopName: { fontSize: 14.5, fontWeight: '600', color: colors.text, flex: 1 },
});
