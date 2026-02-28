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

const HomeScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userData, user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [seasonAdvice, setSeasonAdvice] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const heroIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;

  const seasonValue = useMemo(() => getCurrentSeason(), []);
  const todayLabel = useMemo(() => formatDate(new Date()), []);

  const fetchWeatherContext = useCallback(async () => {
    const apiKey = process.env.EXPO_PUBLIC_OWM_API_KEY;
    if (!apiKey) return null;
    try {
      const lat = 0.8333;
      const lon = 32.5;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );
      const data = await res.json();
      if (!res.ok) return null;
      return {
        temperature: Number(data?.main?.temp) || null,
        condition: data?.weather?.[0]?.main || '',
        description: data?.weather?.[0]?.description || '',
        location: data?.name || 'Luwero',
      };
    } catch {
      return null;
    }
  }, []);

  const maybeSaveSnapshot = useCallback(async (payload: any) => {
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
      const [prediction, weatherContext] = await Promise.all([
        predictBySubCounty({ sub_county: subCounty, season: seasonValue }),
        fetchWeatherContext(),
      ]);
      setRecommendations(prediction.recommendations || []);
      setSeasonAdvice(prediction.season_advice || null);
      setWeather(weatherContext);
      await maybeSaveSnapshot({
        ...prediction.inputs,
        recommendations: prediction.recommendations || [],
      });
    } catch (e: any) {
      setError(e?.message || 'Could not load seasonal recommendations.');
      setRecommendations([]);
      setSeasonAdvice(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWeatherContext, maybeSaveSnapshot, seasonValue, userData?.subCounty]);

  useEffect(() => {
    fetchSeasonalRecommendations();
    Animated.stagger(160, [
      Animated.timing(heroIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fetchSeasonalRecommendations]);

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
          contentContainerStyle={styles.pageScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroIn,
              transform: [
                {
                  translateY: heroIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
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
              <View style={styles.weatherTopRow}>
                <View style={styles.weatherStat}>
                  <Ionicons name="thermometer-outline" size={18} color={colors.secondary} />
                  <Text style={styles.weatherText}>{weather.temperature} C</Text>
                </View>
                <View style={styles.weatherStat}>
                  <Ionicons name="cloud-outline" size={18} color={colors.secondary} />
                  <Text style={styles.weatherText} numberOfLines={1} ellipsizeMode="tail">
                    {weather.description || weather.condition}
                  </Text>
                </View>
              </View>
              <View style={styles.weatherLocationRow}>
                <Ionicons name="location-outline" size={18} color={colors.secondary} />
                <Text style={styles.weatherLocationText} numberOfLines={1} ellipsizeMode="tail">
                  {weather.location || 'Luwero'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
              <Text style={styles.metaText}>{todayLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="map-outline" size={16} color={colors.secondary} />
              <Text style={styles.metaText}>{userData?.subCounty || 'Bamunanika'}</Text>
            </View>
          </View>

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
        </Animated.View>

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

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: 16, paddingBottom: 10 },
    pageScrollContent: { paddingBottom: 32 },
    hero: {
      backgroundColor: colors.glass,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 18,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
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
      backgroundColor: colors.glassSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    weatherTopRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    weatherStat: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glass,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minWidth: 0,
    },
    weatherText: {
      marginLeft: 6,
      color: colors.text,
      fontWeight: WEIGHT.semibold,
      fontSize: TYPE.caption,
      fontFamily: FONT_FAMILY,
      flex: 1,
    },
    weatherLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glass,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    weatherLocationText: {
      marginLeft: 6,
      color: colors.text,
      fontWeight: WEIGHT.semibold,
      fontSize: TYPE.caption,
      fontFamily: FONT_FAMILY,
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 13,
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
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glassSoft,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingVertical: 7,
      paddingHorizontal: 11,
      flex: 1,
    },
    metaText: {
      marginLeft: 6,
      color: colors.text,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      fontFamily: FONT_FAMILY,
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

export default HomeScreen;
