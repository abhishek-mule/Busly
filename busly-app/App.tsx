import React from 'react';
import { ActivityIndicator, View } from 'react-native';
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

const TABS: Record<Role, { name: string; label: string }[]> = {
  driver: [
    { name: 'Home', label: 'Home' },
    { name: 'Attendance', label: 'Attendance' },
    { name: 'Vehicle', label: 'Vehicle' },
    { name: 'Profile', label: 'Profile' },
  ],
  teacher: [
    { name: 'Roster', label: 'Roster' },
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
    { name: 'Roster', label: 'Roster' },
    { name: 'Attendance', label: 'Attendance' },
    { name: 'Vehicle', label: 'Vehicle' },
    { name: 'Profile', label: 'Profile' },
  ],
};

function attendanceFor(mode: 'driver' | 'teacher') {
  return function AttendanceRoute(props: any) {
    return <AttendanceScreen {...props} mode={mode} />;
  };
}

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
          paddingBottom: 8,
        },
      })}
    >
      {tabs.map(({ name, label }) => {
        if (name === 'Home')
          return <Tab.Screen key={name} name="Home" component={HomeScreen} options={{ tabBarLabel: label }} />;
        if (name === 'Attendance')
          return (
            <Tab.Screen
              key={name}
              name="Attendance"
              component={attendanceFor(role === 'driver' ? 'driver' : 'teacher')}
              options={{ tabBarLabel: label }}
            />
          );
        if (name === 'Vehicle')
          return <Tab.Screen key={name} name="Vehicle" component={VehicleScreen} options={{ tabBarLabel: label }} />;
        if (name === 'Roster')
          return <Tab.Screen key={name} name="Roster" component={RosterScreen} options={{ tabBarLabel: label }} />;
        if (name === 'Tracking')
          return <Tab.Screen key={name} name="Tracking" component={TrackingScreen} options={{ tabBarLabel: label }} />;
        if (name === 'Children')
          return <Tab.Screen key={name} name="Children" component={ChildrenScreen} options={{ tabBarLabel: label }} />;
        return <Tab.Screen key={name} name="Profile" component={ProfileScreen} options={{ tabBarLabel: label }} />;
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
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
