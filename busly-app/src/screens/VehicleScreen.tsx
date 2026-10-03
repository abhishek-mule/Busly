import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Bus,
  Users,
  Gauge,
  Fuel,
  CalendarClock,
  ShieldCheck,
  Wrench,
  Inbox,
} from 'lucide-react-native';
import { api } from '../lib/api';
import { colors, radius, shadow } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { ErrorBanner, EmptyState } from '../components/Feedback';

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  seating_capacity: number;
  insurance_expiry: string | null;
  permit_expiry: string | null;
  fitness_expiry: string | null;
  fuel_level: number;
  current_odometer: number;
  status: string;
}

interface Trip {
  id: string;
  vehicle_id: string;
  status: string;
}

interface Maintenance {
  id: string;
  title: string | null;
  maintenance_type: string;
  scheduled_date: string;
  status: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function VehicleScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fleet, setFleet] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [tripsRes, fleetRes] = await Promise.all([
        api.get<{ items: Trip[] }>(`/trips?date=${today()}&limit=50`),
        api.get<{ items: Vehicle[] }>('/vehicles?limit=50'),
      ]);
      const trips = tripsRes.items ?? [];
      const current =
        trips.find((t) => t.status === 'in_progress') ?? trips.find((t) => t.status === 'scheduled') ?? null;
      const fleetItems = fleetRes.items ?? [];
      setFleet(fleetItems);

      const assigned =
        (current?.vehicle_id ? fleetItems.find((v) => v.id === current.vehicle_id) : null) ?? null;
      setVehicle(assigned);

      if (assigned) {
        try {
          const m = await api.get<{ items: Maintenance[] }>(
            `/vehicles/${assigned.id}/maintenance-history`
          );
          setMaintenance((m.items ?? []).slice(0, 6));
        } catch {
          setMaintenance([]);
        }
      } else {
        setMaintenance([]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not load vehicle data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const details: { icon: typeof Users; label: string; value: string }[] = vehicle
    ? [
        { icon: Users, label: 'Capacity', value: `${vehicle.seating_capacity} seats` },
        { icon: Gauge, label: 'Odometer', value: `${(vehicle.current_odometer ?? 0).toLocaleString()} km` },
        { icon: Fuel, label: 'Fuel level', value: `${vehicle.fuel_level ?? 0}%` },
        { icon: ShieldCheck, label: 'Insurance expiry', value: fmtDate(vehicle.insurance_expiry) },
        { icon: CalendarClock, label: 'Permit expiry', value: fmtDate(vehicle.permit_expiry) },
        { icon: Wrench, label: 'Fitness expiry', value: fmtDate(vehicle.fitness_expiry) },
      ]
    : [];

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
        title="My Vehicle"
        subtitle={
          vehicle ? 'Assigned to your trip today' : 'No vehicle assigned to today’s trips'
        }
      />

      <ErrorBanner message={error} onRetry={load} />

      {vehicle ? (
        <>
          <View style={[styles.heroCard, shadow]}>
            <View style={styles.heroIcon}>
              <Bus size={30} color={colors.primary} strokeWidth={1.9} />
            </View>
            <Text style={styles.plate}>{vehicle.plate_number}</Text>
            <Text style={styles.model}>
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.vehicle_type}
            </Text>
            <View
              style={[
                styles.statusPill,
                vehicle.status === 'active' ? styles.statusPillActive : styles.statusPillWarning,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  vehicle.status === 'active' ? styles.statusPillTextActive : styles.statusPillTextWarning,
                ]}
              >
                {vehicle.status === 'active' ? 'Active' : vehicle.status}
              </Text>
            </View>
          </View>

          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Vehicle details</Text>
            {details.map((d, i) => (
              <View
                key={d.label}
                style={[styles.detailRow, i === details.length - 1 && styles.detailRowLast]}
              >
                <View style={styles.detailLabel}>
                  <d.icon size={15} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.detailLabelText}>{d.label}</Text>
                </View>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Maintenance</Text>
            {maintenance.length === 0 ? (
              <View style={styles.inlineNote}>
                <Inbox size={15} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.inlineNoteText}>
                  No maintenance records for this vehicle yet.
                </Text>
              </View>
            ) : (
              maintenance.map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.detailRow, i === maintenance.length - 1 && styles.detailRowLast]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.maintenanceTitle}>{m.title ?? m.maintenance_type}</Text>
                    <Text style={styles.maintenanceMeta}>{fmtDate(m.scheduled_date)}</Text>
                  </View>
                  <View
                    style={[
                      styles.miniPill,
                      m.status === 'completed' ? styles.miniPillDone : styles.miniPillScheduled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniPillText,
                        m.status === 'completed' ? styles.miniPillTextDone : styles.miniPillTextScheduled,
                      ]}
                    >
                      {m.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      ) : (
        !error && (
          <EmptyState
            icon={<Bus size={26} color={colors.primary} strokeWidth={1.8} />}
            title="No vehicle assigned"
            text="A vehicle appears here when it is linked to one of your trips or assigned by the depot."
          />
        )
      )}

      {!vehicle && fleet.length > 0 ? (
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>Fleet</Text>
          {fleet.map((v, i) => (
            <View key={v.id} style={[styles.detailRow, i === fleet.length - 1 && styles.detailRowLast]}>
              <View style={styles.detailLabel}>
                <Bus size={15} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.detailLabelText}>{v.plate_number}</Text>
              </View>
              <View style={styles.fleetRight}>
                <Text style={styles.detailValue}>{v.seating_capacity} seats</Text>
                <View style={[styles.miniPill, v.status === 'active' ? styles.miniPillDone : styles.miniPillScheduled]}>
                  <Text
                    style={[
                      styles.miniPillText,
                      v.status === 'active' ? styles.miniPillTextDone : styles.miniPillTextScheduled,
                    ]}
                  >
                    {v.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  heroCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  plate: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  model: { fontSize: 14, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12 },
  statusPillActive: { backgroundColor: colors.successSoft },
  statusPillWarning: { backgroundColor: colors.warningSoft },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statusPillTextActive: { color: colors.success },
  statusPillTextWarning: { color: colors.warning },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    padding: 18,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  detailLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  detailLabelText: { fontSize: 13.5, color: colors.textMuted, fontWeight: '500' },
  detailValue: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  maintenanceTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  maintenanceMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  miniPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  miniPillDone: { backgroundColor: colors.successSoft },
  miniPillScheduled: { backgroundColor: colors.warningSoft },
  miniPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  miniPillTextDone: { color: colors.success },
  miniPillTextScheduled: { color: colors.warning },
  fleetRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  inlineNoteText: { fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 18 },
});
