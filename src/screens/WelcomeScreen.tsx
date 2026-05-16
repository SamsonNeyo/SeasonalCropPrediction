import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Platform,
  Animated,
  Easing,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

const HERO_IMAGE = require('../../assets/hero-farmer.jpg');
const SCREEN_H = Dimensions.get('window').height;

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
    icon: 'brain',
    title: 'AI crop advisor',
    body: 'Ask any farming question and get instant, expert-level guidance.',
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(180, [
      Animated.timing(heroAnim, {
        toValue: 1, duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1, duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(btnAnim, {
        toValue: 1, duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, cardAnim, btnAnim]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero image (top only) ── */}
        <ImageBackground
          source={HERO_IMAGE}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />

          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: heroAnim,
                transform: [{
                  translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoRing}>
              <Image
                source={require('../../assets/splash-icon.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>

            {/* Brand */}
            <Text style={styles.appName}>SmartCrop</Text>
            <Text style={styles.tagline}>Your AI-powered farm advisor</Text>

            {/* Trust badges */}
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.badgeText}>Luwero District</Text>
              </View>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="shield-check-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.badgeText}>Free to use</Text>
              </View>
            </View>
          </Animated.View>
        </ImageBackground>

        {/* ── Content card ── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [{
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }),
                }],
              },
            ]}
          >
            {/* Section label */}
            <View style={styles.sectionLabelRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>What you get</Text>
              <View style={styles.sectionLine} />
            </View>

            {/* Features */}
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <MaterialCommunityIcons name={f.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Actions */}
            <Animated.View
              style={[
                styles.actions,
                {
                  opacity: btnAnim,
                  transform: [{
                    translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
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
        </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { flexGrow: 1 },

    // ── Hero (top image section) ──
    hero: {
      minHeight: SCREEN_H * 0.52,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.xxl + 36,
    },
    heroImage: {
      width: '100%',
      height: '100%',
      ...(Platform.OS === 'web' ? ({ objectFit: 'cover', objectPosition: 'center center' } as any) : {}),
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(4, 22, 12, 0.58)',
    },

    // ── Hero content (centered) ──
    heroContent: {
      alignItems: 'center',
      gap: SPACING.md,
    },

    // Logo ring
    logoRing: {
      width: 108,
      height: 108,
      borderRadius: 30,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.28)',
    },
    logo: { width: '100%', height: '100%' },

    appName: {
      fontFamily: FONT_FAMILY,
      fontSize: 38,
      fontWeight: WEIGHT.bold,
      color: '#FFFFFF',
      letterSpacing: 0.6,
      marginBottom: 8,
      textAlign: 'center',
    },
    tagline: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
      color: 'rgba(255,255,255,0.78)',
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 300,
    },

    // Badges
    badgeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
      justifyContent: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.24)',
      borderRadius: RADIUS.pill,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    badgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.3,
    },

    // ── Card ──
    card: {
      backgroundColor: c.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      flex: 1,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.xl + 4,
      paddingBottom: SPACING.xxl,
      maxWidth: Platform.OS === 'web' ? 500 : undefined,
      alignSelf: Platform.OS === 'web' ? 'center' : undefined,
      width: '100%',
    },

    // Section label
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    sectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.bold,
      color: c.lightText,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
      opacity: 0.6,
    },

    // ── Features ──
    features: { gap: SPACING.md + 4, marginBottom: SPACING.xl + 4 },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    featureIcon: {
      width: 46,
      height: 46,
      borderRadius: RADIUS.md,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureText: { flex: 1, paddingTop: 2 },
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

    // ── Actions ──
    actions: { gap: SPACING.md },
    btnPrimary: {
      height: 56,
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
      letterSpacing: 0.3,
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
