import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  House,
  ClipboardCheck,
  Bus,
  UsersRound,
  MapPinned,
  Baby,
  User,
} from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme';
import Screen from './src/components/Screen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import RosterScreen from './src/screens/RosterScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import ChildrenScreen from './src/screens/ChildrenScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const icons = {
  Home: House,
  Attendance: ClipboardCheck,
  Vehicle: Bus,
  Roster: UsersRound,
  Tracking: MapPinned,
  Children: Baby,
  Profile: User,
} as const;

type Role = 'driver' | 'parent' | 'teacher' | 'admin';

// Every tab screen renders inside the safe area (below notch/status bar).
// The bottom tab bar adds its own bottom inset from the same provider.
function withScreen<P extends object>(Wrapped: React.ComponentType<P>) {
  return function ScreenWrapped(props: P) {
    return (
      <Screen>
        <Wrapped {...props} />
      </Screen>
    );
  };
}

const SafeHomeScreen = withScreen(HomeScreen);
const SafeVehicleScreen = withScreen(VehicleScreen);
const SafeRosterScreen = withScreen(RosterScreen);
const SafeChildrenScreen = withScreen(ChildrenScreen);
const SafeProfileScreen = withScreen(ProfileScreen);
const DriverAttendanceScreen = withScreen((props: any) => (
  <AttendanceScreen {...props} mode="driver" />
));
const TeacherAttendanceScreen = withScreen((props: any) => (
  <AttendanceScreen {...props} mode="teacher" />
));
const ParentTrackingScreen = withScreen((props: any) => (
  <TrackingScreen {...props} mode="parent" />
));
const FleetTrackingScreen = withScreen((props: any) => (
  <TrackingScreen {...props} mode="all" />
));

const TABS: Record<Role, { name: string; label: string }[]> = {
  driver: [
    { name: 'Home', label: 'Home' },
    { name: 'Attendance', label: 'Attendance' },
    { name: 'Vehicle', label: 'Vehicle' },
    { name: 'Profile', label: 'Profile' },
  ],
  teacher: [
    { name: 'Roster', label: 'Roster' },
    { name: 'Tracking', label: 'Tracking' },
    { name: 'Attendance', label: 'Attendance' },
    { name: 'Profile', label: 'Profile' },
  ],
  parent: [
    { name: 'Tracking', label: 'Tracking' },
    { name: 'Children', label: 'Children' },
    { name: 'Profile', label: 'Profile' },
  ],
  admin: [
    { name: 'Home', label: 'Home' },
    { name: 'Tracking', label: 'Tracking' },
    { name: 'Roster', label: 'Roster' },
    { name: 'Attendance', label: 'Attendance' },
    { name: 'Vehicle', label: 'Vehicle' },
    { name: 'Profile', label: 'Profile' },
  ],
};

const SCREENS: Record<string, React.ComponentType<any>> = {
  Home: SafeHomeScreen,
  Vehicle: SafeVehicleScreen,
  Roster: SafeRosterScreen,
  Children: SafeChildrenScreen,
  Profile: SafeProfileScreen,
};

function MainTabs({ role }: { role: Role }) {
  const tabs = TABS[role];
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const Icon = icons[route.name as keyof typeof icons];
          return <Icon size={size - 2} color={color} strokeWidth={focused ? 2.4 : 1.9} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 6,
          paddingBottom: 6,
        },
      })}
    >
      {tabs.map(({ name, label }) => {
        let component = SCREENS[name] ?? SafeProfileScreen;
        if (name === 'Attendance')
          component = role === 'driver' ? DriverAttendanceScreen : TeacherAttendanceScreen;
        if (name === 'Tracking')
          component = role === 'parent' ? ParentTrackingScreen : FleetTrackingScreen;
        return (
          <Tab.Screen key={name} name={name} component={component} options={{ tabBarLabel: label }} />
        );
      })}
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary },
};

function Root() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const MainRoute = React.useCallback(() => <MainTabs role={role} />, [role]);
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainRoute} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
