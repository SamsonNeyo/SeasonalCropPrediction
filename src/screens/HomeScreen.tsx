import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { predictBySubCounty } from '../services/api';
import { savePrediction } from '../services/firestore';
import { useTheme } from '../context/ThemeContext';
import PredictionCard from '../components/PredictionCard';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

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
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 10;
const WEATHER_BLUE = '#2E6FD8';

const HomeScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const weatherMetaIconColor = useMemo(() => (isDark ? '#CFE1D7' : '#D7EADB'), [isDark]);
  const { userData, user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [seasonAdvice, setSeasonAdvice] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const actionIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  const seasonValue = useMemo(() => getCurrentSeason(), []);
  const todayLabel = useMemo(() => formatDate(new Date()), []);
  const topRecommendation = useMemo(() => recommendations[0] || null, [recommendations]);
  const seasonAction = useMemo(() => {
    if (topRecommendation?.crop) {
      return `Prioritize ${topRecommendation.crop} planning in ${userData?.subCounty || 'your sub-county'} this season.`;
    }
    return 'Collect latest field conditions to generate your next seasonal recommendation.';
  }, [topRecommendation?.crop, userData?.subCounty]);
  const riskChips = useMemo(() => {
    const chips: Array<{ label: string; tone: 'low' | 'medium' | 'high' }> = [];
    if (weather?.temperature != null) {
      const t = Number(weather.temperature);
      if (t >= 31) chips.push({ label: 'Heat stress risk', tone: 'high' });
      else if (t <= 18) chips.push({ label: 'Cold growth risk', tone: 'medium' });
      else chips.push({ label: 'Temperature stable', tone: 'low' });
    }
    if (weather?.description) {
      const w = String(weather.description).toLowerCase();
      if (w.includes('storm') || w.includes('heavy')) chips.push({ label: 'Heavy rain watch', tone: 'high' });
      else if (w.includes('rain')) chips.push({ label: 'Rain support likely', tone: 'low' });
      else if (w.includes('cloud')) chips.push({ label: 'Cloud cover expected', tone: 'low' });
    }
    if (!chips.length) chips.push({ label: 'Data refreshing', tone: 'medium' });
    return chips.slice(0, 3);
  }, [weather?.description, weather?.temperature]);
  const isRain = useMemo(() => {
    const desc = String(weather?.description || '').toLowerCase();
    const cond = String(weather?.condition || '').toLowerCase();
    return desc.includes('rain') || desc.includes('storm') || desc.includes('drizzle') || cond.includes('rain');
  }, [weather?.description, weather?.condition]);

  const fetchWeatherContext = useCallback(async () => {
    const apiKey = process.env.EXPO_PUBLIC_OWM_API_KEY;
    if (!apiKey) return null;
    const cacheKey = 'smartcrop_weather_cache_luwero';
    const now = Date.now();
    try {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.ts && now - cached.ts < WEATHER_CACHE_TTL_MS) {
          return cached.data || null;
        }
      }
    } catch {
      // Ignore cache read failures.
    }
    try {
      const lat = 0.8333;
      const lon = 32.5;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );
      const data = await res.json();
      if (!res.ok) return null;
      const payload = {
        temperature: Number(data?.main?.temp) || null,
        condition: data?.weather?.[0]?.main || '',
        description: String(data?.weather?.[0]?.description || '').toLowerCase(),
        location: data?.name || 'Luwero',
      };
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: now, data: payload }));
      } catch {
        // Ignore cache write failures.
      }
      return payload;
    } catch {
      return null;
    }
  }, []);

  const loadCachedHome = useCallback(async () => {
    const subCounty = userData?.subCounty || 'Bamunanika';
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
  }, [seasonValue, user?.uid, userData?.subCounty]);

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
    const subCounty = userData?.subCounty || 'Bamunanika';
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
          })
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
  }, [fetchWeatherContext, maybeSaveSnapshot, seasonValue, userData?.subCounty, user?.uid]);

  useEffect(() => {
    void loadCachedHome();
    fetchSeasonalRecommendations();
    Animated.stagger(140, [
      Animated.timing(listIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(actionIn, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fetchSeasonalRecommendations, listIn, loadCachedHome, actionIn]);

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
      <Animated.View style={[styles.content, { opacity: listIn }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.pageScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.greeting}>{getGreeting()}, {userData?.name || 'Farmer'}</Text>
              <Text style={styles.heroSubtitle}>
                Seasonal analysis for {userData?.subCounty || 'Bamunanika'}, Luwero.
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="leaf-outline" size={18} color={colors.primary} />
              <Text style={styles.badgeText}>{seasonValue} Season</Text>
            </View>
          </View>

          {weather && (
            <View style={styles.weatherCard}>
              <View style={styles.weatherMainRow}>
                <View style={styles.weatherLeft}>
                  <View style={styles.weatherIconWrap}>
                    <Ionicons name="cloud-outline" size={26} color={WEATHER_BLUE} />
                    {isRain && (
                      <Ionicons name="rainy-outline" size={16} color={WEATHER_BLUE} style={styles.weatherRain} />
                    )}
                  </View>
                  <Text style={styles.weatherTemp}>{weather.temperature} C</Text>
                  <Text style={styles.weatherCondition} numberOfLines={1} ellipsizeMode="tail">
                    {weather.description || weather.condition}
                  </Text>
                </View>
                <View style={styles.weatherDivider} />
                <View style={styles.weatherRight}>
                  <Text style={styles.weatherLabel}>District</Text>
                  <Text style={styles.weatherDistrict} numberOfLines={1} ellipsizeMode="tail">
                    {weather.location || 'Luwero'}
                  </Text>
                  <View style={styles.weatherMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color={weatherMetaIconColor} />
                    <Text style={styles.weatherMetaText}>{todayLabel}</Text>
                  </View>
                  <View style={styles.weatherMetaRow}>
                    <Ionicons name="location-outline" size={16} color={weatherMetaIconColor} />
                    <Text style={styles.weatherMetaText}>{userData?.subCounty || 'Bamunanika'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <Animated.View
            style={[
              styles.todayActionCard,
              {
                opacity: actionIn,
                transform: [
                  {
                    translateY: actionIn.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.todayActionTop}>
              <View style={styles.todayActionBadge}>
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={styles.todayActionBadgeText}>Action</Text>
              </View>
              <View style={styles.todayActionPill}>
                <Text style={styles.todayActionPillText}>Priority</Text>
              </View>
            </View>
            <Text style={styles.todayActionTitle}>This Season Action</Text>
            <View style={styles.todayActionMeta}>
              <Text style={styles.todayActionMetaLabel}>Priority crop</Text>
              <Animated.View
                style={[
                  styles.todayActionCropPill,
                  {
                    transform: [
                      {
                        scale: actionIn.interpolate({
                          inputRange: [0, 0.7, 1],
                          outputRange: [0.92, 1.06, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.todayActionCropText}>
                  {topRecommendation?.crop || 'Not set'}
                  {topRecommendation?.confidence ? ` · ${topRecommendation.confidence}%` : ''}
                </Text>
              </Animated.View>
            </View>
            <Text style={styles.todayActionText}>{seasonAction}</Text>
            <View style={styles.todayActionDivider} />
          <View style={styles.riskRow}>
              {riskChips.map((chip, idx) => (
                <View
                  key={`${chip.label}-${idx}`}
                  style={[
                    styles.riskChip,
                    chip.tone === 'high' ? styles.riskChipHigh : chip.tone === 'medium' ? styles.riskChipMedium : styles.riskChipLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.riskChipText,
                      chip.tone === 'high'
                        ? styles.riskChipTextHigh
                        : chip.tone === 'medium'
                          ? styles.riskChipTextMedium
                          : null,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {!!seasonAdvice && (
            <View style={styles.seasonPlanCard}>
              <View style={styles.seasonPlanTop}>
                <View style={styles.seasonPlanHeader}>
                  <View style={styles.seasonPlanIconWrap}>
                    <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
                  </View>
                  <View style={styles.seasonPlanHeaderText}>
                    <Text style={styles.seasonPlanTitle}>Season Plan</Text>
                    <Text style={styles.seasonPlanSub}>Clear timing for planning, planting and harvest</Text>
                  </View>
                </View>
                <View style={styles.seasonTag}>
                  <Ionicons name="leaf-outline" size={12} color={colors.primary} />
                  <Text style={styles.seasonTagText}>{seasonValue} Season</Text>
                </View>
              </View>

              <View style={styles.seasonGrid}>
                <View style={styles.seasonBlock}>
                  <View style={styles.seasonBlockHead}>
                    <View style={styles.seasonStepBadge}>
                      <Ionicons name="construct-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.seasonStepLabel}>Land Preparation</Text>
                  </View>
                  <Text style={styles.seasonStepValue}>{seasonAdvice.land_preparation_window}</Text>
                </View>
                <View style={styles.seasonBlock}>
                  <View style={styles.seasonBlockHead}>
                    <View style={styles.seasonStepBadge}>
                      <Ionicons name="leaf-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.seasonStepLabel}>Planting Window</Text>
                  </View>
                  <Text style={styles.seasonStepValue}>{seasonAdvice.planting_window}</Text>
                </View>
              </View>

              <View style={styles.seasonInsight}>
                <View style={styles.seasonInsightBar} />
                <Ionicons name="cloudy-night-outline" size={15} color={colors.secondary} />
                <Text style={styles.seasonInsightText}>{seasonAdvice.weather_expectation}</Text>
              </View>
              {!!seasonAdvice.harvest_readiness && (
                <View style={styles.seasonInsight}>
                  <View style={styles.seasonInsightBar} />
                  <Ionicons name="basket-outline" size={15} color={colors.secondary} />
                  <Text style={styles.seasonInsightText}>{seasonAdvice.harvest_readiness}</Text>
                </View>
              )}
            </View>
          )}

        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Seasonal Crop Recommendations</Text>
            <Text style={styles.sectionHint}>
              Recommended crops include timing guidance on when to plant, monitor, and harvest this season.
            </Text>
          </View>
        </View>
        <View style={styles.listArea}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              {!!error && <Text style={styles.error}>{error}</Text>}
              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => <PredictionCard key={`${rec?.crop || 'crop'}-${i}`} prediction={rec} />)
              ) : (
                <Text style={styles.empty}>No seasonal recommendations available yet.</Text>
              )}
            </>
          )}
        </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, isDark: boolean) => {
  const weatherCardBg = isDark ? '#0F2018' : '#1B5E3C';
  const weatherCardBorder = isDark ? '#1C3528' : '#164E32';
  const weatherIconBg = isDark ? '#1D3529' : '#F5FBF7';
  const weatherIconBorder = isDark ? '#2A4A3A' : '#D6E8DE';
  const weatherTextPrimary = isDark ? '#E9F1EC' : '#F4FAF6';
  const weatherTextMuted = isDark ? '#BFD5C9' : '#D6E8DD';
  const weatherDividerColor = isDark ? '#1C3528' : '#2A6F49';
  const riskHighBg = isDark ? '#4A1F1C' : '#F9E6E3';
  const riskHighBorder = isDark ? '#7A2E2A' : '#E6B1A8';
  const riskHighText = isDark ? '#F6D6D2' : colors.text;
  const riskMediumBg = isDark ? '#3B2D13' : '#F3EEE2';
  const riskMediumBorder = isDark ? '#6A5320' : '#D8C59A';
  const riskMediumText = isDark ? '#F3E3BA' : colors.text;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: 16, paddingBottom: 10 },
    pageScrollContent: { paddingBottom: 32 },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    heroText: { flex: 1, paddingRight: 10 },
    greeting: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      fontWeight: WEIGHT.bold,
      color: colors.primary,
    },
    heroSubtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: colors.lightText,
      marginTop: 7,
      lineHeight: 20,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.pillBg,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    badgeText: {
      marginLeft: 6,
      color: colors.primary,
      fontWeight: WEIGHT.semibold,
      fontSize: TYPE.caption,
      fontFamily: FONT_FAMILY,
    },
    weatherCard: {
      backgroundColor: weatherCardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: weatherCardBorder,
      paddingVertical: 14,
      paddingHorizontal: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    weatherMainRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    weatherLeft: {
      flex: 1,
      alignItems: 'flex-start',
      minWidth: 0,
    },
    weatherRight: {
      flex: 1,
      alignItems: 'flex-start',
      minWidth: 0,
    },
    weatherDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: weatherDividerColor,
      opacity: 0.9,
    },
    weatherIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: weatherIconBg,
      borderWidth: 1,
      borderColor: weatherIconBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    weatherRain: {
      position: 'absolute',
      right: 6,
      bottom: 6,
    },
    weatherTemp: {
      color: weatherTextPrimary,
      fontWeight: WEIGHT.bold,
      fontSize: TYPE.h3,
      fontFamily: FONT_FAMILY,
    },
    weatherCondition: {
      marginTop: 4,
      color: weatherTextMuted,
      fontSize: TYPE.caption,
      fontFamily: FONT_FAMILY,
      lineHeight: 18,
      textTransform: 'capitalize',
    },
    weatherLabel: {
      color: weatherTextMuted,
      fontSize: TYPE.tiny,
      fontFamily: FONT_FAMILY,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    weatherDistrict: {
      marginTop: 6,
      color: weatherTextPrimary,
      fontSize: TYPE.bodySmall,
      fontFamily: FONT_FAMILY,
      fontWeight: WEIGHT.semibold,
    },
    weatherMetaRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    weatherMetaText: {
      color: weatherTextMuted,
      fontSize: TYPE.caption,
      fontFamily: FONT_FAMILY,
      fontWeight: WEIGHT.semibold,
      flexShrink: 1,
    },
    seasonPlanCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassSoft,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 13,
      gap: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
    todayActionCard: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    todayActionTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    todayActionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.pillBg,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 999,
    },
    todayActionBadgeText: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    todayActionTitle: {
      marginTop: 10,
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
    },
    todayActionPill: {
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    todayActionPillText: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
    },
    todayActionText: {
      marginTop: 6,
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      lineHeight: 20,
    },
    todayActionMeta: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    todayActionMetaLabel: {
      color: colors.lightText,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    todayActionCropPill: {
      backgroundColor: colors.pillBg,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 8,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    todayActionCropText: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
    },
    todayActionDivider: {
      marginTop: 10,
      height: 1,
      backgroundColor: colors.border,
      opacity: 0.6,
    },
    riskRow: {
      marginTop: 9,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    riskChip: {
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
    },
    riskChipLow: {
      backgroundColor: colors.iconBg,
      borderColor: colors.pillBorder,
    },
    riskChipMedium: {
      backgroundColor: riskMediumBg,
      borderColor: riskMediumBorder,
    },
    riskChipHigh: {
      backgroundColor: riskHighBg,
      borderColor: riskHighBorder,
    },
    riskChipText: {
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
    },
    riskChipTextHigh: {
      color: riskHighText,
    },
    riskChipTextMedium: {
      color: riskMediumText,
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
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    seasonPlanHeaderText: { flex: 1 },
    seasonTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.pillBg,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      maxWidth: 130,
    },
    seasonTagText: {
      marginLeft: 4,
      fontFamily: FONT_FAMILY,
      color: colors.primary,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
    },
    seasonPlanSub: {
      color: colors.lightText,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      marginTop: 1,
    },
    seasonPlanTitle: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.bold,
    },
    seasonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    seasonBlock: {
      flex: 1,
      minWidth: 140,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 11,
      backgroundColor: colors.glass,
      paddingVertical: 9,
      paddingHorizontal: 9,
    },
    seasonBlockHead: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    seasonStepBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    seasonStepLabel: {
      color: colors.lightText,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
    },
    seasonStepValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      marginTop: 1,
    },
    seasonInsight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 11,
      backgroundColor: colors.glass,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    seasonInsightBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 99,
      backgroundColor: colors.accent,
      marginRight: 6,
    },
    seasonInsightText: {
      marginLeft: 7,
      flex: 1,
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      lineHeight: 18,
    },
    sectionWrap: {},
    listArea: { minHeight: 220 },
    sectionHeader: { marginBottom: 14, gap: 6 },
    sectionTitle: {
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
    },
    sectionHint: { color: colors.lightText, fontSize: TYPE.caption, fontFamily: FONT_FAMILY },
    error: { color: colors.error, textAlign: 'center', marginTop: 8, marginBottom: 8, fontFamily: FONT_FAMILY },
    empty: { color: colors.lightText, textAlign: 'center', marginTop: 14, fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall },
    bgAccent: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors.iconBg,
      right: -85,
      top: -95,
      opacity: 0.75,
    },
  });
};

export default HomeScreen;
