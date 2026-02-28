import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ManualAnalysisScreen from '../screens/ManualAnalysisScreen';
import AIAdvisorScreen from '../screens/AIAdvisorScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForecastScreen from '../screens/ForecastScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const PERSISTENCE_KEY = 'smartcrop-nav-state';

const MainTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.lightText,
        tabBarStyle: {
          height: 68,
          paddingBottom: 9,
          paddingTop: 8,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-variant-outline';
          if (route.name === 'Home') iconName = 'home-variant-outline';
          if (route.name === 'Manual') iconName = 'sprout-outline';
          if (route.name === 'AI') iconName = 'brain';
          if (route.name === 'Forecast') iconName = 'chart-line';
          if (route.name === 'History') iconName = 'history';
          if (route.name === 'Profile') iconName = 'account-circle-outline';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="AI" component={AIAdvisorScreen} options={{ title: 'AI Advisor' }} />
      <Tab.Screen name="Forecast" component={ForecastScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, userData, loading } = useAuth();
  const [initialState, setInitialState] = useState<any>(undefined);
  const [isReady, setIsReady] = useState(Platform.OS !== 'web');
  const isProfileComplete = (() => {
    if (!userData) return false;
    if (typeof userData.profileComplete === 'boolean') return userData.profileComplete;
    return !!String(userData.subCounty || '').trim();
  })();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const stored = localStorage.getItem(PERSISTENCE_KEY);
      if (stored) {
        setInitialState(JSON.parse(stored));
      }
    } catch {
      // Ignore persistence errors.
    } finally {
      setIsReady(true);
    }
  }, []);

  if (loading || !isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) => {
        if (Platform.OS !== 'web') return;
        try {
          localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
        } catch {
          // Ignore persistence errors.
        }
      }}
    >
      <Stack.Navigator key={user ? 'user' : 'guest'} screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : !isProfileComplete ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ManualAnalysis" component={ManualAnalysisScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
