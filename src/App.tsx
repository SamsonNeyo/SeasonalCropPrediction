import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const App = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const AppWithTheme = () => {
  const { isDark } = useTheme();
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

export default App;
