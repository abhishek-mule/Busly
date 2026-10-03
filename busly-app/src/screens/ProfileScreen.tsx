import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  CircleAlert,
  X,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { colors, radius, shadow } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [pwVisible, setPwVisible] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const name = user?.full_name || 'Driver';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const role = (user?.roles && user.roles[0]) || user?.role || 'driver';

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const closePwModal = () => {
    setPwVisible(false);
    setOldPw('');
    setNewPw('');
    setPwError('');
    setPwSuccess(false);
  };

  const submitPassword = async () => {
    if (!oldPw || !newPw) {
      setPwError('Both fields are required.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setPwError('');
    try {
      await api.post('/auth/change-password', { old_password: oldPw, new_password: newPw });
      setPwSuccess(true);
      setTimeout(closePwModal, 900);
    } catch (e: any) {
      setPwError(e?.message ?? 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.rolePill}>
          <ShieldCheck size={12} color={colors.white} strokeWidth={2.4} />
          <Text style={styles.rolePillText}>{role}</Text>
        </View>
      </View>

      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Mail size={16} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.infoText}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={16} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.infoText}>{user?.phone || 'No phone number on file'}</Text>
        </View>
      </View>

      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>Security</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setPwVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuIcon}>
            <KeyRound size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.menuText}>Change password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.85}>
        <LogOut size={17} color={colors.danger} strokeWidth={2.4} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Modal visible={pwVisible} transparent animationType="fade" onRequestClose={closePwModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadow]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change password</Text>
              <TouchableOpacity onPress={closePwModal} hitSlop={8}>
                <X size={20} color={colors.textMuted} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {pwSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Password updated successfully.</Text>
              </View>
            ) : (
              <>
                {pwError ? (
                  <View style={styles.errorBox}>
                    <CircleAlert size={15} color={colors.danger} strokeWidth={2.2} />
                    <Text style={styles.errorText}>{pwError}</Text>
                  </View>
                ) : null}

                <View style={styles.inputWrap}>
                  <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Current password"
                    placeholderTextColor={colors.tabInactive}
                    value={oldPw}
                    onChangeText={(v) => {
                      setOldPw(v);
                      setPwError('');
                    }}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={colors.tabInactive}
                    value={newPw}
                    onChangeText={(v) => {
                      setNewPw(v);
                      setPwError('');
                    }}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, saving && { opacity: 0.7 }]}
                  onPress={submitPassword}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.modalButtonText}>Update password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 26,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: colors.primary },
  name: { fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 14 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginTop: 9,
  },
  rolePillText: { color: colors.white, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: radius.lg,
    padding: 18,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoText: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 2,
    paddingTop: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    marginHorizontal: 16,
    marginTop: 16,
    height: 52,
    borderRadius: radius.md,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 22 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '500', flex: 1 },
  successBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  successText: { color: colors.success, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 0 },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  modalButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
