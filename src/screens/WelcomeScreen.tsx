import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

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
  const { continueAsGuest } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  const handleGuest = async () => {
    try {
      setGuestError('');
      setGuestLoading(true);
      await continueAsGuest();
    } catch (e: any) {
      setGuestError(e?.message || 'Could not continue as guest. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(160, [
      Animated.timing(heroAnim, {
        toValue: 1, duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1, duration: 620,
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

  const heroNode = (
    <View style={[styles.hero, isDesktopWeb && styles.heroFlush]}>
      <Animated.View
        style={[
          styles.heroContent,
          {
            opacity: heroAnim,
            transform: [{
              translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
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
        <Text style={styles.tagline}>Your AI-powered farm advisor</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color={styles.badgeText.color} />
            <Text style={styles.badgeText}>Luwero District</Text>
          </View>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-check-outline" size={12} color={styles.badgeText.color} />
            <Text style={styles.badgeText}>Free to use</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const cardNode = (
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
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionLabel}>What you get</Text>
        <View style={styles.sectionLine} />
      </View>

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

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {!!guestError && (
          <Text style={styles.guestError}>{guestError}</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.btnGuest, pressed && { opacity: 0.75 }]}
          onPress={handleGuest}
          disabled={guestLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue without signing in"
        >
          {guestLoading ? (
            <ActivityIndicator size="small" color={colors.lightText} />
          ) : (
            <>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.lightText} />
              <Text style={styles.btnGuestText}>Continue without signing in</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.guestNote}>
          No account needed · Some features may be limited
        </Text>
      </Animated.View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.root}>
      {isDesktopWeb ? (
        // Desktop web: hero + card scroll together as one page
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {heroNode}
          {cardNode}
        </ScrollView>
      ) : (
        // Mobile (native or mobile web): hero fixed, only card scrolls
        <>
          {heroNode}
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {cardNode}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors, isDark: boolean) => {
  const heroTextColor  = isDark ? c.background   : '#FFFFFF';
  const heroBadgeBg    = isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
  const heroBadgeBorder = isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)';
  const heroBadgeText  = isDark ? c.background   : 'rgba(255,255,255,0.92)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.primary },
    // Mobile: card-only scroll
    cardScroll: { flex: 1 },
    scroll: { flexGrow: 1 },
    // Desktop web: full-page scroll
    scrollContent: { flexGrow: 1 },

    // ── Hero ──
    hero: {
      backgroundColor: c.primary,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.xl,
      paddingHorizontal: SPACING.xxl,
      alignItems: 'center',
    },
    heroFlush: { paddingBottom: 0 },
    heroContent: { alignItems: 'center', width: '100%' },

    logoRing: {
      width: 108,
      height: 108,
      borderRadius: 30,
      overflow: 'hidden',
      marginBottom: SPACING.lg,
      borderWidth: 3,
      borderColor: heroBadgeBorder,
    },
    logo: { width: '100%', height: '100%' },

    appName: {
      fontFamily: FONT_FAMILY,
      fontSize: 38,
      fontWeight: WEIGHT.bold,
      color: heroTextColor,
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    tagline: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: isDark ? `${c.background}CC` : 'rgba(255,255,255,0.82)',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: SPACING.lg + 4,
      maxWidth: 260,
    },

    badgeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: heroBadgeBg,
      borderWidth: 1,
      borderColor: heroBadgeBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    badgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: heroBadgeText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.3,
    },

    // ── Card ──
    card: {
      backgroundColor: c.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      marginTop: SPACING.lg,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.xl + 4,
      paddingBottom: SPACING.xxl,
      flexGrow: 1,
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
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginVertical: SPACING.xs,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    dividerText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    btnGuest: {
      height: 52,
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: c.surface,
    },
    btnGuestText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.1,
    },
    guestNote: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      textAlign: 'center',
      opacity: 0.7,
      letterSpacing: 0.2,
    },
    guestError: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.error,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
  });
};

export default WelcomeScreen;
