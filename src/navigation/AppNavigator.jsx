import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config';

import LoginScreen         from '../screens/auth/LoginScreen';
import DashboardScreen     from '../screens/dashboard/DashboardScreen';
import TestCasesScreen     from '../screens/testcases/TestCasesScreen';
import TestCaseFormScreen  from '../screens/testcases/TestCaseFormScreen';
import WorkUpdatesScreen   from '../screens/workupdates/WorkUpdatesScreen';
import WorkEntryFormScreen from '../screens/workupdates/WorkEntryFormScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const HEADER_STYLE = {
  headerStyle:      { backgroundColor: COLORS.primary },
  headerTintColor:  COLORS.headerText,
  headerTitleStyle: { fontWeight: '700' },
};

// ── Test Cases Stack ──────────────────────────────────────────────────────────
function TestCasesStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen name="TestCasesList" component={TestCasesScreen}
        options={{ title: 'Test Cases' }} />
      <Stack.Screen name="TestCaseForm" component={TestCaseFormScreen}
        options={({ route }) => ({ title: route.params?.id ? 'Edit Test Case' : 'Add Test Case' })} />
    </Stack.Navigator>
  );
}

// ── Work Updates Stack ────────────────────────────────────────────────────────
function WorkUpdatesStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen name="WorkUpdatesList" component={WorkUpdatesScreen}
        options={{ title: 'Work Updates' }} />
      <Stack.Screen name="WorkEntryForm" component={WorkEntryFormScreen}
        options={({ route }) => ({ title: route.params?.id ? 'Edit Entry' : 'Add Entry' })} />
    </Stack.Navigator>
  );
}

// ── Main Bottom Tabs ──────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard:   focused ? 'bar-chart'        : 'bar-chart-outline',
            TestCases:   focused ? 'clipboard'        : 'clipboard-outline',
            WorkUpdates: focused ? 'time'             : 'time-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen}
        options={{ headerShown: true, title: 'Dashboard', ...HEADER_STYLE }} />
      <Tab.Screen name="TestCases"   component={TestCasesStack}
        options={{ title: 'Test Cases' }} />
      <Tab.Screen name="WorkUpdates" component={WorkUpdatesStack}
        options={{ title: 'Work Updates' }} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
