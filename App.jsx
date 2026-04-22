import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Deep-link prefix — matches the scheme in app.json
const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'aerotestmanager://'],
  config: {
    screens: {
      // LoginScreen handles sso-callback internally via handleDeepLink
      Login: {
        screens: {
          'sso-callback': 'sso-callback',
        },
      },
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
