// Dynamic Expo config so secrets/keys come from the environment at build time.
// Local dev: `npx expo start` works with zero env vars.
// Release builds: set GOOGLE_MAPS_API_KEY (Android map tiles) — see eas.json.
module.exports = {
  expo: {
    name: 'Busly',
    slug: 'busly',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './busly.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      backgroundColor: '#4F46E5',
    },
    android: {
      package: 'app.busly.mobile',
      versionCode: 1,
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      // Release builds need a Google Maps API key, otherwise the map renders blank.
      // Free tier: https://developers.google.com/maps/documentation/android-sdk/cloud-setup
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      },
    },
    ios: {
      bundleIdentifier: 'app.busly.mobile',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Busly uses your location to show live bus tracking during trips.',
      },
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Busly uses your location to show live bus tracking during trips.',
        },
      ],
    ],
    extra: {
      // Filled in by `npx eas init` (links the app to your expo.dev project).
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'YOUR-EAS-PROJECT-ID',
      },
    },
  },
};
