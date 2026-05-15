import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { predictBySubCounty } from '../services/api';
import { savePrediction } from '../services/firestore';
import { refreshWeatherAlertIfEnabled } from '../services/notifications';
import { fetchWeatherContext } from '../services/weather';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import PredictionCard from '../components/PredictionCard';
import Chip, { ChipTone } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import Skeleton, { SkeletonGroup } from '../components/Skeleton';
import StatTile from '../components/StatTile';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'First';
  if (month >= 8 && month <= 12) return 'Second';
  return 'First';
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const HOME_CACHE_TTL_MS = 1000 * 60 * 30;

const PRED_MESSAGES = [
  'Analysing your farm conditions…',
  'Finding the best crops for this season…',
  'Preparing your personalised recommendations…',
  'Almost ready…',
];

type RiskChip = { label: string; tone: ChipTone; icon: keyof typeof MaterialCommunityIcons.glyphMap };

const HomeScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { userData, user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [seasonAdvice, setSeasonAdvice] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const heroIn = useRef(new Animated.Value(0)).current;
  const statsIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  const seasonValue = useMemo(() => getCurrentSeason(), []);
  const todayLabel = useMemo(() => formatDate(new Date()), []);
  const topRecommendation = useMemo(() => recommendations[0] || null, [recommendations]);
  const otherRecommendations = useMemo(() => recommendations.slice(1), [recommendations]);
  const subCounty = userData?.subCounty || 'Bamunanika';
  const farmerName = userData?.name || user?.email?.split('@')[0] || 'Farmer';
  const userPhoto = userData?.photoBase64 || userData?.photoUri || null;

  const riskChips = useMemo(() => {
    const chips: RiskChip[] = [];
    if (weather?.temperature != null) {
      const t = Number(weather.temperature);
      if (t >= 31) chips.push({ label: 'Heat stress risk', tone: 'danger', icon: 'thermometer-high' });
      else if (t <= 18) chips.push({ label: 'Cold growth risk', tone: 'warning', icon: 'thermometer-low' });
      else chips.push({ label: 'Temperature stable', tone: 'success', icon: 'thermometer' });
    }
    if (weather?.description) {
      const w = String(weather.description).toLowerCase();
      if (w.includes('storm') || w.includes('heavy')) chips.push({ label: 'Heavy rain watch', tone: 'danger', icon: 'weather-pouring' });
      else if (w.includes('rain')) chips.push({ label: 'Rain support likely', tone: 'success', icon: 'weather-rainy' });
      else if (w.includes('cloud')) chips.push({ label: 'Cloud cover', tone: 'info', icon: 'weather-cloudy' });
      else if (w.includes('sun') || w.includes('clear')) chips.push({ label: 'Sunny window', tone: 'warning', icon: 'weather-sunny' });
    }
    if (!chips.length) chips.push({ label: 'Data refreshing', tone: 'neutral', icon: 'refresh' });
    return chips.slice(0, 4);
  }, [weather?.description, weather?.temperature]);

  const dangerCount = useMemo(
    () => riskChips.filter((c) => c.tone === 'danger' || c.tone === 'warning').length,
    [riskChips],
  );
  const totalRecs = recommendations.filter((r: any) => (Number(r.confidence) || 0) >= 50).length;
  const topConfidence = topRecommendation?.confidence || 0;

  const isRain = useMemo(() => {
    const desc = String(weather?.description || '').toLowerCase();
    const cond = String(weather?.condition || '').toLowerCase();
    return desc.includes('rain') || desc.includes('storm') || desc.includes('drizzle') || cond.includes('rain');
  }, [weather?.description, weather?.condition]);

  const loadCachedHome = useCallback(async () => {
    const cacheKey = `smartcrop_home_cache_${user?.uid || 'guest'}_${subCounty}_${seasonValue}`;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (!cached?.ts || Date.now() - cached.ts > HOME_CACHE_TTL_MS) return false;
      setRecommendations(cached.recommendations || []);
      setSeasonAdvice(cached.seasonAdvice || null);
      setWeather(cached.weather || null);
      setLoading(false);
      return true;
    } catch {
      return false;
    }
  }, [seasonValue, user?.uid, subCounty]);

  const maybeSaveSnapshot = useCallback(async (payload: any) => {
    if (!user) return;
    const snapshotKey = `smartcrop_home_last_saved_${user?.uid || 'guest'}`;
    const fingerprint = JSON.stringify({
      sub_county: payload?.sub_county,
      season: payload?.season,
      top_crop: payload?.recommendations?.[0]?.crop || '',
      date: new Date().toISOString().slice(0, 10),
    });
    try {
      const last = await AsyncStorage.getItem(snapshotKey);
      if (last === fingerprint) return;
      await savePrediction(payload);
      await AsyncStorage.setItem(snapshotKey, fingerprint);
    } catch {
      // Ignore history write failures.
    }
  }, [user?.uid]);

  const fetchSeasonalRecommendations = useCallback(async () => {
    try {
      setError('');
      const predictionPromise = predictBySubCounty({ sub_county: subCounty, season: seasonValue });
      const weatherPromise = fetchWeatherContext();
      const prediction = await predictionPromise;
      setRecommendations(prediction.recommendations || []);
      setSeasonAdvice(prediction.season_advice || null);
      setLoading(false);
      const weatherContext = await weatherPromise;
      setWeather(weatherContext);
      void refreshWeatherAlertIfEnabled({
        subCounty,
        region: userData?.region || 'Luwero',
        weather: weatherContext,
      });
      void maybeSaveSnapshot({
        ...prediction.inputs,
        recommendations: prediction.recommendations || [],
      });
      const cacheKey = `smartcrop_home_cache_${user?.uid || 'guest'}_${subCounty}_${seasonValue}`;
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            ts: Date.now(),
            recommendations: prediction.recommendations || [],
            seasonAdvice: prediction.season_advice || null,
            weather: weatherContext || null,
          }),
        );
      } catch {
        // Ignore cache write failures.
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load seasonal recommendations.');
      setRecommendations((prev: any[]) => (prev?.length ? prev : []));
      setSeasonAdvice((prev: any) => prev || null);
    } finally {
      setLoading(false);
    }
  }, [maybeSaveSnapshot, seasonValue, user?.uid, userData?.region, subCounty]);

  useEffect(() => {
    void loadCachedHome();
    fetchSeasonalRecommendations();
    Animated.stagger(120, [
      Animated.timing(headerIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(statsIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(listIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fetchSeasonalRecommendations, loadCachedHome, headerIn, heroIn, statsIn, listIn]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchSeasonalRecommendations();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <View style={styles.bgAccentTwo} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ─── Header strip ───────────────────────────────────── */}
        <Animated.View
          style={[
            styles.headerStrip,
            {
              opacity: headerIn,
              transform: [{ translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <View style={styles.avatarSmall}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={styles.avatarImg} />
            ) : (
              <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.headerStripText}>
            <Text style={styles.headerEyebrow} numberOfLines={1}>{getGreeting().toLowerCase()}</Text>
            <Text style={styles.headerName} numberOfLines={1}>{farmerName}</Text>
          </View>
          <View style={styles.seasonChip} accessibilityLabel={`${seasonValue} season`}>
            <Ionicons name="leaf" size={13} color={colors.primary} />
            <Text style={styles.seasonChipText}>{seasonValue} Season</Text>
          </View>
        </Animated.View>

        {/* ─── Hero / weather panel ───────────────────────────── */}
        <Animated.View
          style={[
            {
              opacity: heroIn,
              transform: [{ translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {weather ? (
            <View style={styles.weatherCard}>
              <View style={styles.weatherTopBar}>
                <View style={styles.weatherTopBadge}>
                  <Ionicons name="leaf-outline" size={11} color={styles.weatherTextPrimary.color as string} />
                  <Text style={styles.weatherTopBadgeText}>Today · {todayLabel}</Text>
                </View>
                <View style={styles.weatherLocationPill}>
                  <Ionicons name="location" size={11} color={styles.weatherTextPrimary.color as string} />
                  <Text style={styles.weatherLocationText} numberOfLines={1}>{subCounty}</Text>
                </View>
              </View>

              <View style={styles.weatherMainRow}>
                <View style={styles.weatherTempBlock}>
                  <Text style={styles.weatherTemp}>{weather.temperature}°</Text>
                  <Text style={styles.weatherCondition} numberOfLines={1}>
                    {weather.description || weather.condition}
                  </Text>
                </View>
                <View style={styles.weatherIconBig}>
                  <Ionicons
                    name={isRain ? 'rainy' : 'partly-sunny'}
                    size={48}
                    color={styles.weatherIconAccent.color as string}
                  />
                </View>
              </View>

              <View style={styles.weatherMetricsRow}>
                {weather?.humidity != null && (
                  <WeatherMetric icon="water-outline" value={`${weather.humidity}%`} label="Humidity" isDark={isDark} />
                )}
                {weather?.wind != null && (
                  <WeatherMetric icon="speedometer-outline" value={`${weather.wind}`} label="Wind" isDark={isDark} />
                )}
                <WeatherMetric icon="calendar-outline" value={seasonValue} label="Season" isDark={isDark} />
              </View>
            </View>
          ) : loading ? (
            <Skeleton height={172} borderRadius={RADIUS.xl} style={styles.heroSkel} />
          ) : null}
        </Animated.View>

        {/* ─── Risk chips ─────────────────────────────────────── */}
        {!!weather && riskChips.length > 0 && (
          <View style={styles.riskRow}>
            {riskChips.map((chip, idx) => (
              <Chip key={`${chip.label}-${idx}`} label={chip.label} tone={chip.tone} icon={chip.icon} size="sm" />
            ))}
          </View>
        )}

        {/* ─── At-a-glance KPI strip ──────────────────────────── */}
        <Animated.View
          style={[
            {
              opacity: statsIn,
              transform: [{ translateY: statsIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          {loading && totalRecs === 0 ? (
            <SkeletonGroup style={styles.statRowSkel}>
              <Skeleton height={92} borderRadius={RADIUS.md} />
              <Skeleton height={92} borderRadius={RADIUS.md} />
              <Skeleton height={92} borderRadius={RADIUS.md} />
            </SkeletonGroup>
          ) : (
            <View style={styles.statRow}>
              <StatTile
                icon="sprout-outline"
                tone="primary"
                value={totalRecs || 0}
                label="Crops"
                hint={totalRecs > 0 ? 'matched' : undefined}
              />
              <StatTile
                icon="gauge"
                tone={topConfidence >= 75 ? 'success' : topConfidence >= 50 ? 'accent' : 'neutral'}
                value={topConfidence ? `${topConfidence}%` : '—'}
                label="Top fit"
                hint={topConfidence >= 75 ? 'strong' : topConfidence >= 50 ? 'good' : topConfidence > 0 ? 'moderate' : undefined}
              />
              <StatTile
                icon={dangerCount > 0 ? 'alert-decagram-outline' : 'shield-check-outline'}
                tone={dangerCount > 0 ? 'danger' : 'success'}
                value={dangerCount}
                label="Risks"
                hint={dangerCount > 0 ? 'flagged' : 'clear'}
              />
            </View>
          )}
        </Animated.View>

        {/* ─── Season plan ────────────────────────────────────── */}
        {!!seasonAdvice && (
          <View style={styles.seasonPlanCard}>
            <View style={styles.seasonPlanTop}>
              <View style={styles.seasonPlanHeader}>
                <View style={styles.seasonPlanIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.seasonPlanHeaderText}>
                  <Text style={styles.seasonPlanTitle}>Season plan</Text>
                  <Text style={styles.seasonPlanSub}>Land preparation, planting and harvest timing</Text>
                </View>
              </View>
            </View>

            <View style={styles.seasonGrid}>
              <SeasonBlock
                icon="construct-outline"
                label="Land prep"
                value={seasonAdvice.land_preparation_window}
                colors={colors}
              />
              <SeasonBlock
                icon="leaf-outline"
                label="Planting"
                value={seasonAdvice.planting_window}
                colors={colors}
              />
            </View>

            {!!seasonAdvice.weather_expectation && (
              <View style={styles.seasonInsight}>
                <View style={styles.seasonInsightBar} />
                <Ionicons name="cloudy-night-outline" size={15} color={colors.secondary} />
                <Text style={styles.seasonInsightText}>{seasonAdvice.weather_expectation}</Text>
              </View>
            )}
            {!!seasonAdvice.harvest_readiness && (
              <View style={styles.seasonInsight}>
                <View style={styles.seasonInsightBar} />
                <Ionicons name="basket-outline" size={15} color={colors.secondary} />
                <Text style={styles.seasonInsightText}>{seasonAdvice.harvest_readiness}</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Recommendations ────────────────────────────────── */}
        <Animated.View
          style={[
            styles.recsSection,
            {
              opacity: listIn,
              transform: [{ translateY: listIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionLabel}>Recommendations</Text>
            <View style={styles.sectionLine} />
            {totalRecs > 0 && (
              <Text style={styles.sectionCount}>{totalRecs} {totalRecs === 1 ? 'crop' : 'crops'}</Text>
            )}
          </View>

          {loading ? (
            recommendations.length === 0 ? (
              <PredictionLoader />
            ) : (
              <SkeletonGroup style={styles.skelGroup}>
                <Skeleton height={300} borderRadius={RADIUS.xl} />
                <Skeleton height={210} borderRadius={RADIUS.lg} />
                <Skeleton height={210} borderRadius={RADIUS.lg} />
              </SkeletonGroup>
            )
          ) : error ? (
            <EmptyState
              icon="cloud-off-outline"
              variant="error"
              title="Could not load recommendations"
              description={error}
              actionLabel="Try again"
              onAction={fetchSeasonalRecommendations}
            />
          ) : topRecommendation ? (
            <>
              <PredictionCard prediction={topRecommendation} variant="featured" />

              {otherRecommendations.length > 0 && (
                <>
                  <View style={styles.subSectionRow}>
                    <Text style={styles.subSectionLabel}>More options to consider</Text>
                  </View>
                  {otherRecommendations.map((rec, i) => (
                    <PredictionCard
                      key={`${rec?.crop || 'crop'}-${i}`}
                      prediction={rec}
                      variant="compact"
                      rank={i + 2}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            <EmptyState
              icon="seed-outline"
              title="No recommendations yet"
              description="Pull to refresh, or check that your sub-county is set in your profile."
              actionLabel="Refresh"
              onAction={fetchSeasonalRecommendations}
            />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const WeatherMetric = ({
  icon,
  value,
  label,
  isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string | number;
  label: string;
  isDark: boolean;
}) => {
  const textPrimary = isDark ? '#E9F1EC' : '#F4FAF6';
  const textMuted = isDark ? '#BFD5C9' : '#D6E8DD';
  const wrapBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)';
  const wrapBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.30)';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: wrapBg,
        borderWidth: 1,
        borderColor: wrapBorder,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm + 2,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={12} color={textMuted} />
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: TYPE.tiny, color: textMuted, fontWeight: WEIGHT.semibold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontFamily: FONT_FAMILY, fontSize: TYPE.body, color: textPrimary, fontWeight: WEIGHT.bold }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const SeasonBlock = ({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  colors: ThemeColors;
}) => {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: RADIUS.md,
        backgroundColor: colors.glass,
        paddingVertical: SPACING.md - 2,
        paddingHorizontal: SPACING.md - 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: RADIUS.sm,
            backgroundColor: colors.iconBg,
            borderWidth: 1,
            borderColor: colors.pillBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={13} color={colors.primary} />
        </View>
        <Text
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: TYPE.tiny,
            color: colors.lightText,
            fontWeight: WEIGHT.semibold,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: TYPE.bodySmall,
          color: colors.text,
          fontWeight: WEIGHT.semibold,
          lineHeight: 19,
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const PredictionLoader = () => {
  const { colors } = useTheme();
  const [msgIdx, setMsgIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setMsgIdx((i) => (i + 1) % PRED_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(cycle);
  }, [fadeAnim]);

  return (
    <View style={{
      minHeight: 360,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xl,
      paddingHorizontal: SPACING.xxl,
    }}>
      {/* Icon */}
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: colors.iconBg,
        borderWidth: 1,
        borderColor: colors.pillBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <MaterialCommunityIcons name="sprout" size={38} color={colors.primary} />
      </View>

      {/* Spinner */}
      <ActivityIndicator size="large" color={colors.primary} />

      {/* Fading message */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: SPACING.sm }}>
        <Text style={{
          fontFamily: FONT_FAMILY,
          fontSize: TYPE.body,
          fontWeight: WEIGHT.bold,
          color: colors.text,
          textAlign: 'center',
          lineHeight: 24,
        }}>
          {PRED_MESSAGES[msgIdx]}
        </Text>
        <Text style={{
          fontFamily: FONT_FAMILY,
          fontSize: TYPE.caption,
          color: colors.lightText,
          textAlign: 'center',
          lineHeight: 18,
        }}>
          Personalised for your farm in Luwero
        </Text>
      </Animated.View>
    </View>
  );
};

const createStyles = (c: ThemeColors, isDark: boolean) => {
  const weatherCardBg = isDark ? '#102219' : c.primary;
  const weatherCardBorder = isDark ? '#1F3528' : '#164E32';
  const weatherTextPrimary = isDark ? '#E9F1EC' : '#F4FAF6';
  const weatherTextMuted = isDark ? '#BFD5C9' : '#D6E8DD';
  const weatherIconAccent = isDark ? '#9CC3D7' : '#FFE9A8';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    pageScrollContent: {
      padding: SPACING.lg,
      paddingBottom: SPACING.huge,
    },

    // ── Header strip ──
    headerStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 2,
      marginBottom: SPACING.lg,
    },
    avatarSmall: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    headerStripText: { flex: 1, minWidth: 0 },
    headerEyebrow: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    headerName: {
      marginTop: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: c.text,
    },
    seasonChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 6,
      paddingHorizontal: SPACING.sm + 2,
    },
    seasonChipText: {
      fontFamily: FONT_FAMILY,
      color: c.primary,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },

    // ── Weather hero card ──
    weatherCard: {
      backgroundColor: weatherCardBg,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: weatherCardBorder,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
      ...elevation(c.shadow, 'lg'),
    },
    heroSkel: { marginBottom: 0 },
    weatherTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    weatherTopBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.32)',
      borderRadius: RADIUS.pill,
      paddingVertical: 4,
      paddingHorizontal: SPACING.sm,
    },
    weatherTopBadgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: weatherTextPrimary,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.4,
    },
    weatherLocationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.32)',
      borderRadius: RADIUS.pill,
      paddingVertical: 4,
      paddingHorizontal: SPACING.sm,
      maxWidth: 160,
    },
    weatherLocationText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: weatherTextPrimary,
      fontWeight: WEIGHT.bold,
    },
    weatherMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
    },
    weatherTempBlock: { flex: 1, minWidth: 0 },
    weatherTemp: {
      fontFamily: FONT_FAMILY,
      fontSize: 56,
      lineHeight: 60,
      fontWeight: WEIGHT.bold,
      color: weatherTextPrimary,
      letterSpacing: -1,
    },
    weatherCondition: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: weatherTextMuted,
      fontWeight: WEIGHT.semibold,
      textTransform: 'capitalize',
    },
    weatherIconBig: {
      width: 80,
      height: 80,
      borderRadius: RADIUS.lg,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.30)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherIconAccent: { color: weatherIconAccent } as any,
    weatherTextPrimary: { color: weatherTextPrimary } as any,
    weatherMetricsRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },

    // ── Risk chips ──
    riskRow: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },

    // ── Stats ──
    statRow: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    statRowSkel: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      gap: SPACING.sm,
    },

    // ── Season plan ──
    seasonPlanCard: {
      marginTop: SPACING.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glass,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.md + 2,
      paddingHorizontal: SPACING.md + 2,
      gap: SPACING.sm + 2,
      ...elevation(c.shadow, 'md'),
    },
    seasonPlanTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    seasonPlanHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    seasonPlanIconWrap: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.sm + 2,
      borderWidth: 1,
      borderColor: c.pillBorder,
      backgroundColor: c.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm + 2,
    },
    seasonPlanHeaderText: { flex: 1 },
    seasonPlanTitle: {
      fontFamily: FONT_FAMILY,
      color: c.text,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
    },
    seasonPlanSub: {
      marginTop: 2,
      color: c.lightText,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
    },
    seasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    seasonInsight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      backgroundColor: c.glassSoft,
      paddingVertical: SPACING.sm + 1,
      paddingHorizontal: SPACING.sm + 2,
      gap: 6,
    },
    seasonInsightBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 99,
      backgroundColor: c.accent,
    },
    seasonInsightText: {
      marginLeft: 4,
      flex: 1,
      color: c.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      lineHeight: 19,
    },

    // ── Section header ──
    recsSection: { marginTop: SPACING.xl },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    sectionDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
      opacity: 0.6,
    },
    sectionCount: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
    },
    subSectionRow: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm + 2,
    },
    subSectionLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    skelGroup: { gap: SPACING.md },

    // ── Background accents ──
    bgAccent: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: c.iconBg,
      right: -85,
      top: -95,
      opacity: 0.5,
    },
    bgAccentTwo: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: c.pillBg,
      left: -50,
      top: 220,
      opacity: 0.45,
    },
  });
};

export default HomeScreen;
