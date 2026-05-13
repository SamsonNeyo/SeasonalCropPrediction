import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ManualAnalysisScreen from '../screens/ManualAnalysisScreen';
import AIAdvisorScreen from '../screens/AIAdvisorScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const PERSISTENCE_KEY = 'smartcrop-nav-state';

type TabIconConfig = {
  outline: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  filled: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
};

const TAB_ICONS: Record<string, TabIconConfig> = {
  Home: { outline: 'home-variant-outline', filled: 'home-variant', label: 'Home' },
  AI: { outline: 'brain', filled: 'brain', label: 'AI Advisor' },
  Manual: { outline: 'clipboard-edit-outline', filled: 'clipboard-edit', label: 'Manual analysis' },
  History: { outline: 'history', filled: 'history', label: 'History' },
  Profile: { outline: 'account-circle-outline', filled: 'account-circle', label: 'Profile' },
};

const MainTabs = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createTabStyles(colors), [colors]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        const config = TAB_ICONS[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.lightText,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarAccessibilityLabel: config?.label || route.name,
          sceneStyle: {
            paddingBottom: 96,
            backgroundColor: colors.background,
          },
          tabBarStyle: {
            height: 76,
            paddingBottom: 12,
            paddingTop: 10,
            borderTopWidth: 0,
            backgroundColor: colors.surface,
            borderRadius: RADIUS.xxl,
            marginHorizontal: SPACING.md,
            marginBottom: Platform.OS === 'ios' ? 14 : 10,
            position: 'absolute',
            ...elevation(colors.shadow, 'lg'),
            overflow: 'visible',
          },
          tabBarItemStyle: styles.tabItem,
          tabBarIconStyle: { marginTop: 2 },
          tabBarLabelStyle: {
            fontSize: Platform.OS === 'web' ? TYPE.caption : TYPE.tiny,
            fontWeight: WEIGHT.semibold,
            lineHeight: Platform.OS === 'web' ? 14 : 12,
            marginTop: 2,
            marginBottom: 2,
            fontFamily: FONT_FAMILY,
          },
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused
              ? config?.filled || 'home-variant'
              : config?.outline || 'home-variant-outline';
            return (
              <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
                <MaterialCommunityIcons name={iconName} size={size} color={color} />
              </View>
            );
          },
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="AI" component={AIAdvisorScreen} options={{ title: 'AI Advisor' }} />
      <Tab.Screen name="Manual" component={ManualAnalysisScreen} options={{ title: 'Manual' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { colors, isDark } = useTheme();
  const { user, userData, loading } = useAuth();
  const [initialState, setInitialState] = useState<any>(undefined);
  const [isReady, setIsReady] = useState(Platform.OS !== 'web');
  const navTheme = React.useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [colors.background, colors.border, colors.primary, colors.surface, colors.text, isDark]);
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
      theme={navTheme}
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
      <Stack.Navigator
        key={!user ? 'auth' : !isProfileComplete ? 'setup' : 'main'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !isProfileComplete ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

const createTabStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabItem: {
      paddingVertical: 4,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md + 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapFocused: {
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
    },
  });
