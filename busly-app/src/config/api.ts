// Production backend is the default so every build (EAS, Expo Go without
// env, local) talks to a working API unless explicitly overridden.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://busly-zjnc.onrender.com/api/v1';

export const TENANT_ID = 'default';
