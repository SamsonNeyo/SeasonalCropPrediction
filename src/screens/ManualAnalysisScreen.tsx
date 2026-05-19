import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { getSoilZones, predictBySubCounty } from '../services/api';
import { savePrediction } from '../services/firestore';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Skeleton, { SkeletonGroup } from '../components/Skeleton';
import SelectSheet, { SelectOption } from '../components/SelectSheet';
import PredictionCard from '../components/PredictionCard';
import StatTile from '../components/StatTile';
import { useToast } from '../components/Toast';

type Zone = { sub_county: string; soil_type: string };

const ManualAnalysisScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toast = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loadingZones, setLoadingZones] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subCountyOpen, setSubCountyOpen] = useState(false);
  const [error, setError] = useState('');
  const [analysisInputs, setAnalysisInputs] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const headerIn = React.useRef(new Animated.Value(0)).current;
  const formIn = React.useRef(new Animated.Value(0)).current;
  const resultIn = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(formIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [headerIn, formIn]);

  useEffect(() => {
    if (recommendations) {
      resultIn.setValue(0);
      Animated.timing(resultIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [recommendations, resultIn]);

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoadingZones(true);
        const payload = await getSoilZones();
        const list: Zone[] = payload?.soil_zones || [];
        const sorted = [...list].sort((a, b) => a.sub_county.localeCompare(b.sub_county));
        setZones(sorted);
        if (sorted.length > 0) setSelectedZone(sorted[0]);
      } catch {
        setError('Could not load sub-county list. Please check your connection.');
      } finally {
        setLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!selectedZone) {
      setError('Select a sub-county first.');
      return;
    }
    try {
      setError('');
      setSaved(false);
      setAnalyzing(true);
      const response = await predictBySubCounty({ sub_county: selectedZone.sub_county });
      setAnalysisInputs(response.inputs);
      setRecommendations(response.recommendations || []);
    } catch {
      setError('Prediction failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [selectedZone]);

  const saveToHistory = useCallback(async () => {
    if (!analysisInputs || !recommendations) return;
    try {
      setSaving(true);
      await savePrediction({ ...analysisInputs, recommendations });
      setSaved(true);
      toast.show({ message: 'Analysis saved to history.', tone: 'success' });
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Sign in to save history.';
      toast.show({ message: `Save failed: ${msg}`, tone: 'error', duration: 4500 });
    } finally {
      setSaving(false);
    }
  }, [analysisInputs, recommendations, toast]);

  const subCountyOptions: SelectOption<string>[] = useMemo(
    () =>
      zones.map((z) => ({
        label: z.sub_county,
        value: z.sub_county,
        description: `Mapped soil: ${z.soil_type}`,
      })),
    [zones],
  );

  const topRec = recommendations?.[0] || null;
  const restRecs = recommendations?.slice(1) || [];
  const topConfidence = topRec?.confidence || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <View style={styles.bgAccentTwo} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerIn,
              transform: [{ translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Manual analysis</Text>
            <Text style={styles.subtitle}>Pick a Luwero sub-county for tailored crop and timing guidance.</Text>
          </View>
        </Animated.View>

        {/* ── Selection card ── */}
        <Animated.View
          style={{
            opacity: formIn,
            transform: [{ translateY: formIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={styles.card}>
            <View style={styles.cardEyebrowRow}>
              <View style={styles.cardEyebrow}>
                <MaterialCommunityIcons name="map-search-outline" size={11} color={colors.primary} />
                <Text style={styles.cardEyebrowText}>Step 1</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>Choose your sub-county</Text>
            <Text style={styles.cardCaption}>
              We map your sub-county to local soil and seasonal patterns to suggest the right crops.
            </Text>

            {loadingZones ? (
              <Skeleton height={68} borderRadius={RADIUS.md} style={styles.selectSkel} />
            ) : (
              <TouchableOpacity
                style={styles.selectField}
                onPress={() => setSubCountyOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Select sub-county"
              >
                <View style={styles.selectLeftIcon}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.selectTextWrap}>
                  <Text style={styles.selectLabel}>Sub-county</Text>
                  <Text style={styles.selectValue}>{selectedZone?.sub_county || 'Select sub-county'}</Text>
                  {!!selectedZone?.soil_type && (
                    <View style={styles.soilRow}>
                      <MaterialCommunityIcons name="terrain" size={11} color={colors.lightText} />
                      <Text style={styles.selectHint}>{selectedZone.soil_type}</Text>
                    </View>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
              </TouchableOpacity>
            )}

            <Button
              label={analyzing ? 'Analyzing…' : 'Run analysis'}
              onPress={runAnalysis}
              loading={analyzing}
              disabled={loadingZones || !selectedZone}
              fullWidth
              size="lg"
              leftIcon={
                analyzing ? undefined : (
                  <MaterialCommunityIcons name="flash-outline" size={18} color={colors.white} />
                )
              }
              style={styles.runBtn}
              accessibilityLabel="Run seasonal analysis"
            />

            {!!error && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Section header ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionLabel}>Results</Text>
          <View style={styles.sectionLine} />
          {recommendations && recommendations.length > 0 && (
            <Text style={styles.sectionCount}>
              {recommendations.length} {recommendations.length === 1 ? 'crop' : 'crops'}
            </Text>
          )}
        </View>

        {/* ── Results ── */}
        {analyzing ? (
          <SkeletonGroup style={styles.skelGroup}>
            <Skeleton height={92} borderRadius={RADIUS.md} />
            <Skeleton height={220} borderRadius={RADIUS.xl} />
            <Skeleton height={72} borderRadius={RADIUS.lg} />
          </SkeletonGroup>
        ) : !recommendations ? (
          <EmptyState
            icon="chart-box-outline"
            title="No analysis yet"
            description="Pick a sub-county above and run the analysis to see crop recommendations with harvest timing."
            variant="inline"
          />
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon="seed-outline"
            title="No recommendations available"
            description="Try a different sub-county or run the analysis again."
            variant="inline"
            actionLabel="Try again"
            onAction={runAnalysis}
          />
        ) : (
          <Animated.View
            style={{
              opacity: resultIn,
              transform: [{ translateY: resultIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
            {/* KPI strip */}
            <View style={styles.statRow}>
              <StatTile
                icon="sprout-outline"
                tone="primary"
                value={recommendations.filter((r: any) => (Number(r.confidence) || 0) >= 50).length}
                label="Crops"
                hint="matched"
              />
              <StatTile
                icon="gauge"
                tone={topConfidence >= 75 ? 'success' : topConfidence >= 50 ? 'accent' : 'neutral'}
                value={topConfidence ? `${topConfidence}%` : '—'}
                label="Top fit"
                hint={topConfidence >= 75 ? 'strong' : topConfidence >= 50 ? 'good' : topConfidence > 0 ? 'moderate' : undefined}
              />
              <StatTile
                icon="map-marker-outline"
                tone="accent"
                value={selectedZone?.sub_county || '—'}
                label="Zone"
              />
            </View>

            {/* Featured */}
            <PredictionCard prediction={topRec} variant="featured" />

            {/* Compact list */}
            {restRecs.length > 0 && (
              <>
                <View style={styles.subSectionRow}>
                  <Text style={styles.subSectionLabel}>More options</Text>
                </View>
                {restRecs.map((rec, i) => (
                  <PredictionCard
                    key={`${rec?.crop || 'crop'}-${i}`}
                    prediction={rec}
                    variant="compact"
                    rank={i + 2}
                  />
                ))}
              </>
            )}

            {/* Save CTA */}
            <Button
              label={saved ? 'Saved to history' : 'Save to history'}
              onPress={saveToHistory}
              loading={saving}
              disabled={saved}
              variant={saved ? 'tertiary' : 'secondary'}
              fullWidth
              size="md"
              leftIcon={
                <MaterialCommunityIcons
                  name={saved ? 'check-circle-outline' : 'content-save-outline'}
                  size={18}
                  color={saved ? colors.primary : colors.primary}
                />
              }
              style={styles.saveBtn}
              accessibilityLabel="Save analysis to history"
            />
          </Animated.View>
        )}
      </ScrollView>

      <SelectSheet
        visible={subCountyOpen}
        onClose={() => setSubCountyOpen(false)}
        title="Select sub-county"
        subtitle="Soil type is mapped automatically when you choose."
        options={subCountyOptions}
        value={selectedZone?.sub_county || ''}
        onSelect={(value) => {
          const zone = zones.find((z) => z.sub_county === value);
          if (zone) setSelectedZone(zone);
          setSubCountyOpen(false);
        }}
      />
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.huge },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    headerText: { flex: 1 },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.title,
      fontWeight: WEIGHT.bold,
      color: c.primary,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      marginTop: 2,
      lineHeight: 19,
    },

    // Selection card
    card: {
      backgroundColor: c.glass,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: SPACING.lg,
      ...elevation(c.shadow, 'md'),
    },
    cardEyebrowRow: { flexDirection: 'row', marginBottom: SPACING.sm + 2 },
    cardEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 3,
      paddingHorizontal: SPACING.sm,
    },
    cardEyebrowText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: c.text,
    },
    cardCaption: {
      marginTop: 4,
      marginBottom: SPACING.md,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      lineHeight: 19,
    },
    selectSkel: { marginBottom: SPACING.md },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: c.glassSoft,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.md,
    },
    selectLeftIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectTextWrap: { flex: 1, minWidth: 0 },
    selectLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    selectValue: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.text,
      fontWeight: WEIGHT.bold,
    },
    soilRow: {
      marginTop: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    selectHint: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
    },
    runBtn: {},
    errorBanner: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: `${c.error}15`,
      borderWidth: 1,
      borderColor: `${c.error}40`,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      color: c.error,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
    },

    // Section
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.xl,
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
    skelGroup: { gap: SPACING.md },

    // Results
    statRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    subSectionRow: { marginTop: SPACING.sm, marginBottom: SPACING.sm + 2 },
    subSectionLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    saveBtn: { marginTop: SPACING.md },

    // Background accents
    bgAccent: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: c.iconBg,
      right: -80,
      top: -90,
      opacity: 0.55,
    },
    bgAccentTwo: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: c.pillBg,
      left: -50,
      top: 240,
      opacity: 0.4,
    },
  });

export default ManualAnalysisScreen;
