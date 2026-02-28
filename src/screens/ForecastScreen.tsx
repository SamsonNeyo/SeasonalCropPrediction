import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getForecast } from '../services/api';

const ForecastScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [series, setSeries] = useState<any[]>([]);
  const [cropPrices, setCropPrices] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setError('');
        setLoading(true);
        const payload = await getForecast(6);
        setSeries(payload?.series || []);
        setCropPrices(payload?.crop_price_forecast_ugx || []);
      } catch {
        setError('Could not load forecast data.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const formatUGX = (value: number) =>
    `UGX ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-line" size={22} color={colors.primary} />
          <Text style={styles.title}>Yield and Price Forecast</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Monthly Outlook</Text>
            {series.map((row, index) => (
              <View key={`${row.month}-${index}`} style={styles.card}>
                <Text style={styles.month}>{row.month}</Text>
                <Text style={styles.line}>Yield: {row.yield_forecast_t_per_ha} t/ha</Text>
                <Text style={styles.line}>Avg market price: {formatUGX(row.average_price_ugx_per_kg)}/kg</Text>
              </View>
            ))}
            <Text style={styles.sectionTitle}>Crop Prices (UGX)</Text>
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
                    {item.trend}
                  </Text>
                </View>
                <Text style={styles.line}>This month: {formatUGX(item.current_price_ugx)}/kg</Text>
                <Text style={styles.line}>Next month: {formatUGX(item.next_month_price_ugx)}/kg</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    title: { fontSize: 20, fontWeight: '800', color: colors.primary },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.secondary, marginBottom: 8, marginTop: 6 },
    error: { color: colors.error, textAlign: 'center' },
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
    month: { fontSize: 15, fontWeight: '700', color: colors.secondary, marginBottom: 6 },
    line: { fontSize: 13, color: colors.text, marginTop: 2 },
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
    cropName: { fontSize: 15, fontWeight: '800', color: colors.primary },
    trend: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    trendUp: { color: '#1F8A3D' },
    trendDown: { color: '#B0382F' },
    trendStable: { color: colors.lightText },
  });

export default ForecastScreen;
