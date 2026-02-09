import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ManualAnalysisScreen from '../screens/ManualAnalysisScreen';
import AIAdvisorScreen from '../screens/AIAdvisorScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const PERSISTENCE_KEY = 'smartcrop-nav-state';

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#228B22',
      tabBarInactiveTintColor: '#6f6f6f',
      tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
      tabBarIcon: ({ color, size }) => {
        let iconName = 'home-variant-outline';
        if (route.name === 'Home') iconName = 'home-variant-outline';
        if (route.name === 'Manual') iconName = 'sprout-outline';
        if (route.name === 'AI') iconName = 'brain';
        if (route.name === 'History') iconName = 'history';
        if (route.name === 'Profile') iconName = 'account-circle-outline';
        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Manual" component={ManualAnalysisScreen} options={{ title: 'Manual Analysis' }} />
    <Tab.Screen name="AI" component={AIAdvisorScreen} options={{ title: 'AI Advisor' }} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [initialState, setInitialState] = useState<any>(undefined);
  const [isReady, setIsReady] = useState(Platform.OS !== 'web');

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
