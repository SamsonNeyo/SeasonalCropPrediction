import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { predictCrops, searchCrop } from '../services/api';
import { savePrediction } from '../services/firestore';
import { COLORS } from '../constants/colors';
import PredictionCard from '../components/PredictionCard';

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
  const heroIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;

  const fetchWeatherAndPredict = async () => {
    try {
      setError('');
      const apiKey = process.env.EXPO_PUBLIC_OWM_API_KEY;
      if (!apiKey) {
        throw new Error('Missing OpenWeatherMap API key.');
      }
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

      const season = getCurrentSeason();
      const defaultSoil = userData?.soilType || 'Loam';
      const firstItem = data?.list?.[0];
      const temperature = Number(firstItem?.main?.temp) || 26;
      const next24h = Array.isArray(data?.list) ? data.list.slice(0, 8) : [];
      const rainMm = next24h.reduce((sum: number, item: any) => {
        const r = Number(item?.rain?.['3h'] ?? 0);
        return sum + (Number.isFinite(r) ? r : 0);
      }, 0);
      const locationName = data?.city?.name || 'Luwero District';
      const rainfall = rainMm || (season === 'First' ? 180 : 120);
      const condition = firstItem?.weather?.[0]?.main || '';
      const description = firstItem?.weather?.[0]?.description || '';

      const inputs = { season, soil_type: defaultSoil, temperature, rainfall };
      const result = await predictCrops(inputs);

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
        err?.message === 'Missing OpenWeatherMap API key.'
          ? 'Missing OpenWeatherMap API key.'
          : err?.message || 'Could not fetch live data.';
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Ionicons name="leaf-outline" size={18} color={COLORS.primary} />
            <Text style={styles.badgeText}>{getCurrentSeason()} Season</Text>
          </View>
        </View>

        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherItem}>
              <Ionicons name="thermometer-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.weatherText}>{weather.temperature} C</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Ionicons name="rainy-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.weatherText}>{Number(weather.rain || 0).toFixed(1)} mm</Text>
            </View>
            <View style={styles.weatherDivider} />
            <View style={styles.weatherItem}>
              <Ionicons name="location-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.weatherText}>{weather.location || 'Luwero'}</Text>
            </View>
          </View>
        )}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.secondary} />
            <Text style={styles.metaText}>{formatDate(now)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
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
              <Ionicons name="search" size={16} color={COLORS.secondary} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search crop"
              placeholderTextColor={COLORS.lightText}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              underlineColorAndroid="transparent"
              selectionColor={COLORS.primary}
            />
            {!!search && (
              <TouchableOpacity style={styles.clearSearch} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.lightText} />
              </TouchableOpacity>
            )}
          </View>
          {!!search && searching && <Text style={styles.searchStatus}>Searching...</Text>}
          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroText: { flex: 1, paddingRight: 8 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  heroSubtitle: { fontSize: 14, color: COLORS.lightText, marginTop: 6 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4EA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: { marginLeft: 6, color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  weatherItem: { flexDirection: 'row', alignItems: 'center' },
  weatherText: { marginLeft: 6, color: COLORS.text, fontWeight: '600', fontSize: 13 },
  weatherDivider: { width: 1, height: 18, backgroundColor: '#e4e4e4' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F3',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metaText: { marginLeft: 6, color: COLORS.text, fontSize: 12, fontWeight: '600' },
  sectionWrap: {},
  sectionHeader: { marginVertical: 12, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.secondary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E9E0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '600',
    outlineStyle: 'none',
  },
  clearSearch: { paddingLeft: 6 },
  searchStatus: { color: COLORS.lightText, fontSize: 12 },
  searchError: { color: COLORS.error, fontSize: 12 },
  error: { color: COLORS.error, textAlign: 'center', marginTop: 8, marginBottom: 8 },
  empty: { color: COLORS.lightText, textAlign: 'center', marginTop: 12 },
  bgAccent: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E7F2E7',
    right: -90,
    top: -80,
    opacity: 0.6,
  },
});

export default HomeScreen;
