import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getForecast } from '../services/api';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

type ForecastRow = {
  month: string;
  yield_forecast_t_per_ha: number;
  average_price_ugx_per_kg: number;
};

type CropPriceRow = {
  crop: string;
  current_price_ugx: number;
  next_month_price_ugx: number;
  trend: 'up' | 'down' | 'stable' | string;
};

const seasonForMonth = (monthNumber: number) => {
  if (monthNumber >= 3 && monthNumber <= 6) return 'First Season';
  if (monthNumber >= 8 && monthNumber <= 12) return 'Second Season';
  return 'Transition Period';
};

const readableMonth = (value: string) => {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const ForecastScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [series, setSeries] = useState<ForecastRow[]>([]);
  const [cropPrices, setCropPrices] = useState<CropPriceRow[]>([]);

  const loadForecast = useCallback(async (showLoader = true) => {
    try {
      setError('');
      if (showLoader) setLoading(true);
      const payload = await getForecast(6);
      setSeries(payload?.series || []);
      setCropPrices(payload?.crop_price_forecast_ugx || []);
    } catch {
      setError('Could not load forecast data.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(true);
  }, [loadForecast]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadForecast(false);
    } finally {
      setRefreshing(false);
    }
  };

  const formatUGX = (value: number) =>
    `UGX ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const formatYield = (value: number) => `${Number(value || 0).toFixed(2)} t/ha`;

  const seasonalSummary = useMemo(() => {
    const buckets = new Map<string, { months: string[]; yield: number[]; price: number[] }>();

    series.forEach((row) => {
      const monthNumber = Number(String(row.month).split('-')[1]);
      const season = seasonForMonth(monthNumber);
      const existing = buckets.get(season) || { months: [], yield: [], price: [] };
      existing.months.push(row.month);
      existing.yield.push(Number(row.yield_forecast_t_per_ha) || 0);
      existing.price.push(Number(row.average_price_ugx_per_kg) || 0);
      buckets.set(season, existing);
    });

    const order = ['First Season', 'Second Season', 'Transition Period'];
    return Array.from(buckets.entries())
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([season, data]) => {
        const avgYield = data.yield.reduce((sum, n) => sum + n, 0) / data.yield.length;
        const avgPrice = data.price.reduce((sum, n) => sum + n, 0) / data.price.length;
        const start = data.months[0];
        const end = data.months[data.months.length - 1];
        return {
          season,
          monthsLabel: start === end ? readableMonth(start) : `${readableMonth(start)} - ${readableMonth(end)}`,
          avgYield,
          avgPrice,
        };
      });
  }, [series]);

  const trendLabel = (trend: string) => {
    if (trend === 'up') return 'Rising';
    if (trend === 'down') return 'Falling';
    return 'Stable';
  };
  const topMonth = series[0];
  const headline = topMonth
    ? `${formatYield(topMonth.yield_forecast_t_per_ha)} expected yield and ${formatUGX(topMonth.average_price_ugx_per_kg)}/kg average market price for ${readableMonth(topMonth.month)}.`
    : 'Forecast data will appear once available.';
  const quickStats = useMemo(() => {
    if (!series.length) return [];
    const avgYield = series.reduce((sum, row) => sum + (Number(row.yield_forecast_t_per_ha) || 0), 0) / series.length;
    const avgPrice = series.reduce((sum, row) => sum + (Number(row.average_price_ugx_per_kg) || 0), 0) / series.length;
    return [
      { label: '6-mo avg yield', value: formatYield(avgYield), icon: 'sprout-outline' },
      { label: '6-mo avg price', value: `${formatUGX(avgPrice)}/kg`, icon: 'currency-usd' },
      { label: 'Months tracked', value: String(series.length), icon: 'calendar-range-outline' },
    ];
  }, [series]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="chart-line" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Yield and Price Forecast</Text>
            <Text style={styles.subtitle}>Outlook for planning, input timing, and market strategy.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.8}>
            <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="radar" size={13} color={colors.primary} />
                <Text style={styles.heroBadgeText}>Forecast Status</Text>
              </View>
              <Text style={styles.heroText}>{headline}</Text>
            </View>
            <View style={styles.statsGrid}>
              {quickStats.map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <MaterialCommunityIcons name={stat.icon as any} size={16} color={colors.primary} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Seasonal Yield & Price Outlook</Text>
            {seasonalSummary.map((item) => (
              <View key={item.season} style={styles.card}>
                <Text style={styles.month}>{item.season}</Text>
                <Text style={styles.subLine}>{item.monthsLabel}</Text>
                <Text style={styles.line}>Average yield: {formatYield(item.avgYield)}</Text>
                <Text style={styles.line}>Average market price: {formatUGX(item.avgPrice)}/kg</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Monthly Detail (Next 6 Months)</Text>
            {series.map((row, index) => (
              <View key={`${row.month}-${index}`} style={styles.card}>
                <Text style={styles.month}>{readableMonth(row.month)}</Text>
                <Text style={styles.subLine}>{seasonForMonth(Number(String(row.month).split('-')[1]))}</Text>
                <Text style={styles.line}>Yield: {formatYield(row.yield_forecast_t_per_ha)}</Text>
                <Text style={styles.line}>Avg market price: {formatUGX(row.average_price_ugx_per_kg)}/kg</Text>
              </View>
            ))}
            <Text style={styles.sectionTitle}>Crop Price Direction</Text>
            {cropPrices.map((item, index) => (
              <View key={`${item.crop}-${index}`} style={styles.cropCard}>
                <View style={styles.cropHeader}>
                  <Text style={styles.cropName}>{item.crop}</Text>
                  <Text
                    style={[
                      styles.trend,
                      item.trend === 'up'
                        ? styles.trendUp
                        : item.trend === 'down'
                          ? styles.trendDown
                          : styles.trendStable,
                    ]}
                  >
                    {trendLabel(item.trend)}
                  </Text>
                </View>
                <Text style={styles.line}>Current month estimate: {formatUGX(item.current_price_ugx)}/kg</Text>
                <Text style={styles.line}>Next month estimate: {formatUGX(item.next_month_price_ugx)}/kg</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    headerIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.iconBg,
    },
    title: { fontSize: TYPE.h3, fontWeight: WEIGHT.bold, color: colors.primary, fontFamily: FONT_FAMILY },
    subtitle: { marginTop: 2, color: colors.lightText, fontFamily: FONT_FAMILY, fontSize: TYPE.caption },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { fontSize: TYPE.body, fontWeight: WEIGHT.bold, color: colors.secondary, marginBottom: 8, marginTop: 8, fontFamily: FONT_FAMILY },
    error: { color: colors.error, textAlign: 'center', fontFamily: FONT_FAMILY },
    heroCard: {
      borderWidth: 1,
      borderColor: colors.pillBorder,
      backgroundColor: colors.pillBg,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: 999,
      backgroundColor: colors.surface,
      paddingVertical: 3,
      paddingHorizontal: 8,
      marginBottom: 8,
    },
    heroBadgeText: {
      marginLeft: 4,
      color: colors.primary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
    },
    heroText: {
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      lineHeight: 21,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    statCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 14,
      backgroundColor: colors.glass,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    statValue: {
      marginTop: 5,
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.bold,
      textAlign: 'center',
    },
    statLabel: {
      marginTop: 2,
      color: colors.lightText,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.glass,
      borderRadius: 14,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    month: { fontSize: TYPE.bodySmall, fontWeight: WEIGHT.bold, color: colors.secondary, marginBottom: 6, fontFamily: FONT_FAMILY },
    subLine: { fontSize: TYPE.caption, color: colors.lightText, marginBottom: 4, fontFamily: FONT_FAMILY },
    line: { fontSize: TYPE.caption, color: colors.text, marginTop: 2, fontFamily: FONT_FAMILY },
    cropCard: {
      backgroundColor: colors.glass,
      borderRadius: 14,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cropName: { fontSize: TYPE.bodySmall, fontWeight: WEIGHT.bold, color: colors.primary, fontFamily: FONT_FAMILY },
    trend: { fontSize: TYPE.caption, fontWeight: WEIGHT.bold, textTransform: 'uppercase', fontFamily: FONT_FAMILY },
    trendUp: { color: '#1F8A3D' },
    trendDown: { color: '#B0382F' },
    trendStable: { color: colors.lightText },
    bgAccent: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.iconBg,
      right: -80,
      top: -60,
      opacity: 0.65,
    },
  });

export default ForecastScreen;
