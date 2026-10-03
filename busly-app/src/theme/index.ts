import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  primaryDark: '#4338CA',
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E7E9F1',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  white: '#FFFFFF',
  tabInactive: '#94A3B8',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24 };

export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  android: { elevation: 2 },
  default: {},
}) as ViewStyle;

export const font = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  semibold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
};
