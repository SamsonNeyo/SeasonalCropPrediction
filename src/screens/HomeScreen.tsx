import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { predictCrops, searchCrop } from '../services/api';
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
const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const HomeScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userData } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [lastInputs, setLastInputs] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const heroIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;

  const fetchWeatherAndPredict = async () => {
    const season = getCurrentSeason();
    const defaultSoil = userData?.soilType || 'Loam';
    try {
      setError('');
      let temperature = 26;
      let rainMm = 0;
      let locationName = 'Luwero District';
      let condition = '';
      let description = '';

      const apiKey = process.env.EXPO_PUBLIC_OWM_API_KEY;
      if (apiKey) {
        const lat = 0.8333;
        const lon = 32.5;
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.message ? `OpenWeatherMap: ${data.message}` : 'OpenWeatherMap request failed.';
          throw new Error(msg);
        }

        const firstItem = data?.list?.[0];
        temperature = Number(firstItem?.main?.temp) || 26;
        const next24h = Array.isArray(data?.list) ? data.list.slice(0, 8) : [];
        rainMm = next24h.reduce((sum: number, item: any) => {
          const r = Number(item?.rain?.['3h'] ?? 0);
          return sum + (Number.isFinite(r) ? r : 0);
        }, 0);
        locationName = data?.city?.name || 'Luwero District';
        condition = firstItem?.weather?.[0]?.main || '';
        description = firstItem?.weather?.[0]?.description || '';
      }

      const rainfall = rainMm || (season === 'First' ? 180 : 120);
      const inputs = { season, soil_type: defaultSoil, temperature, rainfall };

      let result: any;
      try {
        result = await predictCrops(inputs);
      } catch (e: any) {
        const msg = e?.message || 'Backend request failed.';
        throw new Error(`Backend: ${msg}`);
      }

      setRecommendations(result.recommendations);
      setLastInputs(inputs);
      setWeather({
        temperature,
        rain: rainMm,
        location: locationName,
        condition,
        description,
        updatedAt: new Date().toISOString(),
      });

      // Local weather alert (only when app opens)
      const alertsEnabled = (await AsyncStorage.getItem('smartcrop_weather_alerts')) === 'true';
      if (alertsEnabled) {
        const lastAlert = Number(await AsyncStorage.getItem('smartcrop_weather_alerts_last') || 0);
        const nowTs = Date.now();
        const shouldAlert = rainMm >= 15 || temperature >= 32;
        if (shouldAlert && nowTs - lastAlert > 6 * 60 * 60 * 1000) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Weather alert',
              body: rainMm >= 15 ? 'Heavy rain expected. Consider drainage.' : 'High heat expected. Watch soil moisture.',
            },
            trigger: null,
          });
          await AsyncStorage.setItem('smartcrop_weather_alerts_last', String(nowTs));
        }
      }

      try {
        await savePrediction({
          season,
          soil_type: defaultSoil,
          temperature,
          rainfall,
          recommendations: result.recommendations,
        });
      } catch {
        // Ignore history save errors so live insights still show.
      }
    } catch (err: any) {
      const msg =
        err?.message || 'Could not fetch live data.';
      setError(`${msg} Showing sample recommendations.`);
      const inputs = { season, soil_type: defaultSoil, temperature: 26, rainfall: 180 };
      setRecommendations([
        { crop: 'Maize', confidence: 85, explanation: 'Good default for First season in Luwero.' },
        { crop: 'Beans', confidence: 72, explanation: 'Fast maturing legume.' },
      ]);
      setLastInputs(inputs);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchWeatherAndPredict();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeatherAndPredict();
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
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredRecommendations = useMemo(() => {
    if (!search.trim()) return recommendations;
    return searchResults || [];
  }, [recommendations, search, searchResults]);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      setSearchError('');
      return;
    }
    if (!lastInputs) return;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError('');
        const res = await searchCrop(lastInputs, q);
        setSearchResults([res.result]);
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404) {
          setSearchResults([]);
          setSearchError('No crops match your search.');
        } else {
          setSearchResults([]);
          setSearchError('Search failed. Please try again.');
        }
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [search, lastInputs]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView
        contentContainerStyle={styles.content}
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
            <Text style={styles.greeting}>
              {getGreeting()}, {userData?.name || 'Farmer'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {weather?.description
                ? `Today: ${weather.description} in ${weather.location || 'Luwero'}.`
                : 'Plan your best crops with real-time insights'}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="leaf-outline" size={18} color={colors.primary} />
            <Text style={styles.badgeText}>{getCurrentSeason()} Season</Text>
          </View>
        </View>

        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherItem}>
              <Ionicons name="thermometer-outline" size={18} color={colors.secondary} />
              <Text style={styles.weatherText}>{weather.temperature} C</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Ionicons name="rainy-outline" size={18} color={colors.secondary} />
              <Text style={styles.weatherText}>{Number(weather.rain || 0).toFixed(1)} mm</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Ionicons name="location-outline" size={18} color={colors.secondary} />
              <Text style={styles.weatherText}>{weather.location || 'Luwero'}</Text>
            </View>
          </View>
        )}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
            <Text style={styles.metaText}>{formatDate(now)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={colors.secondary} />
            <Text style={styles.metaText}>
              {formatTime(now)}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.sectionWrap,
          {
            opacity: listIn,
            transform: [
              {
                translateY: listIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart Insights for Today</Text>
          <View style={styles.searchWrap}>
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search crop"
              placeholderTextColor={colors.lightText}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              underlineColorAndroid="transparent"
              selectionColor={colors.primary}
            />
            {!!search && (
              <TouchableOpacity style={styles.clearSearch} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.lightText} />
              </TouchableOpacity>
            )}
          </View>
          {!!search && searching && <Text style={styles.searchStatus}>Searching...</Text>}
          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((rec, i) => <PredictionCard key={i} prediction={rec} />)
            ) : (
              <Text style={styles.empty}>
                {recommendations.length === 0
                  ? 'No recommendations available yet.'
                  : 'No crops match your search.'}
              </Text>
            )}
          </>
        )}
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  weatherItem: { flexDirection: 'row', alignItems: 'center' },
  weatherText: {
    marginLeft: 6,
    color: colors.text,
    fontWeight: WEIGHT.semibold,
    fontSize: TYPE.caption,
    fontFamily: FONT_FAMILY,
  },
  weatherDivider: { width: 1, height: 18, backgroundColor: colors.border },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  metaText: {
    marginLeft: 6,
    color: colors.text,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.semibold,
    fontFamily: FONT_FAMILY,
  },
  sectionWrap: {},
  sectionHeader: { marginBottom: 14, gap: 10 },
  sectionTitle: {
    fontSize: TYPE.h3,
    fontWeight: WEIGHT.bold,
    color: colors.secondary,
    fontFamily: FONT_FAMILY,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 9,
    color: colors.text,
    paddingVertical: 0,
    fontSize: TYPE.bodySmall,
    fontWeight: WEIGHT.semibold,
    fontFamily: FONT_FAMILY,
  },
  clearSearch: { paddingLeft: 6 },
  searchStatus: { color: colors.lightText, fontSize: TYPE.caption, fontFamily: FONT_FAMILY },
  searchError: { color: colors.error, fontSize: TYPE.caption, fontFamily: FONT_FAMILY },
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
