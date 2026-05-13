import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Animated,
  Easing,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

type Feature = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: 'sprout-outline',
    title: 'Seasonal recommendations',
    body: 'Ranked crop choices tailored to your sub-county and current season.',
  },
  {
    icon: 'weather-partly-cloudy',
    title: 'Weather-aware guidance',
    body: 'Planning hints that adapt to real-time field conditions.',
  },
  {
    icon: 'history',
    title: 'Decision history',
    body: 'Review past recommendations and track your farm decisions.',
  },
];

const WelcomeScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cardAnim    = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(cardAnim, {
        toValue: 1, duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1, duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(btnAnim, {
        toValue: 1, duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardAnim, contentAnim, btnAnim]);

  const card = (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: cardAnim,
          transform: [{
            translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
          }, {
            scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
          }],
        },
      ]}
    >
      {/* Top accent bar */}
      <View style={styles.accentBar} />

      {/* Corner marks */}
      <View style={[styles.cornerTL, { pointerEvents: 'none' }]} />
      <View style={[styles.cornerBR, { pointerEvents: 'none' }]} />

      {/* ── Brand section ── */}
      <Animated.View
        style={[
          styles.brand,
          {
            opacity: contentAnim,
            transform: [{
              translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            }],
          },
        ]}
      >
        <View style={styles.logoRing}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.appName}>SmartCrop</Text>
        <Text style={styles.tagline}>Your seasonal crop guide</Text>
        <Text style={styles.description}>
          Personalized recommendations for Luwero farmers backed by weather data and soil science.
        </Text>
      </Animated.View>

      {/* ── Divider ── */}
      <Animated.View style={[styles.dividerWrap, { opacity: contentAnim }]}>
        <View style={styles.dividerLine} />
      </Animated.View>

      {/* ── Features ── */}
      <Animated.View
        style={[
          styles.features,
          {
            opacity: contentAnim,
            transform: [{
              translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            }],
          },
        ]}
      >
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <MaterialCommunityIcons name={f.icon} size={19} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* ── Actions ── */}
      <Animated.View
        style={[
          styles.actions,
          {
            opacity: btnAnim,
            transform: [{
              translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
          onPress={() => navigation.navigate('Signup')}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={styles.btnSecondaryText}>
            Already have an account?{'  '}
            <Text style={styles.btnSecondaryAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Background orbs */}
      <View style={[styles.orbTopRight, { pointerEvents: 'none' }]} />
      <View style={[styles.orbBottomLeft, { pointerEvents: 'none' }]} />
      <View style={[styles.orbMidRight, { pointerEvents: 'none' }]} />

      {Platform.OS === 'web' ? (
        <View style={styles.webContainer}>{card}</View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {card}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // Background orbs
    orbTopRight: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: c.iconBg,
      top: -80,
      right: -80,
      opacity: 0.9,
    },
    orbBottomLeft: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.pillBg,
      bottom: -60,
      left: -70,
      opacity: 0.85,
    },
    orbMidRight: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: c.iconBg,
      top: '45%',
      right: -40,
      opacity: 0.5,
    },

    // Web: plain centered View — no scroll container so no bounce/scroll on mobile browsers
    webContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: SPACING.xxl,
      paddingVertical: SPACING.xl,
    },

    // Native: ScrollView content container (card is taller than some small screens)
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: SPACING.xxl,
      paddingVertical: SPACING.xl,
    },

    // Glass card
    card: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 480 : undefined,
      alignSelf: 'center',
      backgroundColor: c.glass,
      borderRadius: RADIUS.xxl,
      borderWidth: 1,
      borderColor: c.glassBorder,
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.xxl + 4,
      ...elevation(c.shadow, 'xl'),
    },

    // Accent bar at top of card
    accentBar: {
      width: 52,
      height: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
      alignSelf: 'center',
      marginBottom: SPACING.lg,
      opacity: 0.85,
    },

    // Corner marks
    cornerTL: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 24,
      height: 24,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderColor: c.primary,
      borderTopLeftRadius: 12,
      opacity: 0.7,
    },
    cornerBR: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 24,
      height: 24,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderColor: c.primary,
      borderBottomRightRadius: 12,
      opacity: 0.7,
    },

    // Brand
    brand: { alignItems: 'center', marginBottom: SPACING.lg },
    logoRing: {
      width: 92,
      height: 92,
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: c.glassBorder,
      ...elevation(c.shadow, 'sm'),
    },
    logo: { width: '100%', height: '100%' },

    appName: {
      fontFamily: FONT_FAMILY,
      fontSize: 30,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    tagline: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    description: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 300,
    },

    // Divider
    dividerWrap: { marginVertical: SPACING.lg },
    dividerLine: {
      height: 1,
      backgroundColor: c.glassBorder,
    },

    // Features
    features: { gap: SPACING.md, marginBottom: SPACING.xl },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureText: { flex: 1, paddingTop: 1 },
    featureTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.bold,
      color: c.text,
      marginBottom: 3,
    },
    featureBody: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      lineHeight: 18,
    },

    // Actions
    actions: { gap: SPACING.md },
    btnPrimary: {
      height: 54,
      backgroundColor: c.primary,
      borderRadius: RADIUS.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    btnPrimaryText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: '#fff',
      letterSpacing: 0.2,
    },
    btnSecondary: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    btnSecondaryText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
    },
    btnSecondaryAccent: {
      color: c.primary,
      fontWeight: WEIGHT.bold,
    },
  });

export default WelcomeScreen;
