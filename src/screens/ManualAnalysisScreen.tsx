import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getSoilZones, predictBySubCounty } from '../services/api';
import { savePrediction } from '../services/firestore';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

type Zone = { sub_county: string; soil_type: string };

const ManualAnalysisScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loadingZones, setLoadingZones] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subCountyOpen, setSubCountyOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [analysisInputs, setAnalysisInputs] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const sortedZones = useMemo(() => [...zones].sort((a, b) => a.sub_county.localeCompare(b.sub_county)), [zones]);
  const saveMessageTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoadingZones(true);
        const payload = await getSoilZones();
        const list = payload?.soil_zones || [];
        setZones(list);
        if (list.length > 0) setSelectedZone(list[0]);
      } catch {
        setError('Could not load sub-county list.');
      } finally {
        setLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
    };
  }, []);

  const showSaveMessage = useCallback((message: string, type: 'success' | 'error') => {
    if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
    setToast({ message, type });
    saveMessageTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!selectedZone) {
      setError('Select a sub-county first.');
      return;
    }
    try {
      setError('');
      setToast(null);
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
      setToast(null);
      await savePrediction({ ...analysisInputs, recommendations });
      const message = 'Analysis saved to history.';
      showSaveMessage(message, 'success');
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Sign in to save history.';
      const message = `Save failed: ${msg}`;
      showSaveMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [analysisInputs, recommendations, showSaveMessage]);

  const renderZone = useCallback(
    ({ item: zone }: { item: Zone }) => {
      const active = selectedZone?.sub_county === zone.sub_county;
      return (
        <TouchableOpacity
          style={[styles.modalOption, active && styles.modalOptionActive]}
          onPress={() => {
            setSelectedZone(zone);
            setSubCountyOpen(false);
          }}
        >
          <View style={styles.zoneTextWrap}>
            <Text style={[styles.zoneName, active && styles.zoneNameActive]}>{zone.sub_county}</Text>
            <Text style={styles.zoneSoil}>Mapped soil: {zone.soil_type}</Text>
          </View>
          {active && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
        </TouchableOpacity>
      );
    },
    [colors.primary, selectedZone?.sub_county, styles]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Planting in Luwero</Text>
            <Text style={styles.subtitle}>Choose a target sub-county to get local crop and season timing advice</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How It Works</Text>
          <Text style={styles.cardText}>
            SmartCrop maps your selected sub-county to local soil conditions and seasonal patterns, then suggests crops
            with harvest timing.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Sub-county</Text>
          {loadingZones ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TouchableOpacity style={styles.selectField} onPress={() => setSubCountyOpen(true)}>
              <View style={styles.selectTextWrap}>
                <Text style={styles.selectLabel}>Sub-county</Text>
                <Text style={styles.selectValue}>{selectedZone?.sub_county || 'Select sub-county'}</Text>
                <Text style={styles.selectHint}>Mapped soil: {selectedZone?.soil_type || 'N/A'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={runAnalysis} disabled={analyzing || loadingZones}>
            {analyzing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Run Analysis</Text>
              </>
            )}
          </TouchableOpacity>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.resultsHeader}>
            <Text style={styles.cardTitle}>Recommendations</Text>
            <Text style={styles.countPill}>{recommendations ? `${recommendations.length} crops` : 'No data'}</Text>
          </View>
          {!recommendations && <Text style={styles.cardText}>Select sub-county and run analysis.</Text>}
          {recommendations?.map((item, idx) => (
            <View key={`${item.crop}-${idx}`} style={styles.resultCard}>
              <View style={styles.resultRow}>
                <View style={styles.resultIcon}>
                  <MaterialCommunityIcons name="sprout" size={17} color={colors.primary} />
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultTitle}>{item.crop}</Text>
                  <Text style={styles.resultMeta}>{item.confidence}% confidence</Text>
                </View>
              </View>
              {!!item.explanation && <Text style={styles.resultHint}>{item.explanation}</Text>}
              <View style={styles.planChipRow}>
                {!!item?.planning?.harvest_window && (
                  <View style={styles.planChip}>
                    <MaterialCommunityIcons name="calendar-clock-outline" size={13} color={colors.secondary} />
                    <Text style={styles.planChipText}>{item.planning.harvest_window}</Text>
                  </View>
                )}
                {!!item?.planning?.duration_days && (
                  <View style={styles.planChip}>
                    <MaterialCommunityIcons name="timer-sand" size={13} color={colors.secondary} />
                    <Text style={styles.planChipText}>{item.planning.duration_days} days</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          {!!recommendations && (
            <TouchableOpacity style={styles.saveButton} onPress={saveToHistory} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.white} />
                  <Text style={styles.saveButtonText}>Save to History</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.topNavBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={16} color={colors.primary} />
          <Text style={styles.topNavBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topNavBtn} onPress={() => navigation.navigate('Main')}>
          <MaterialCommunityIcons name="home-outline" size={16} color={colors.primary} />
          <Text style={styles.topNavBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={subCountyOpen} transparent animationType="fade" onRequestClose={() => setSubCountyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSubCountyOpen(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sub-county</Text>
              <TouchableOpacity onPress={() => setSubCountyOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.lightText} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sortedZones}
              keyExtractor={(item) => item.sub_county}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={12}
              windowSize={8}
              renderItem={renderZone}
            />
          </View>
        </Pressable>
      </Modal>
      {!!toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <MaterialCommunityIcons
            name={toast.type === 'error' ? 'alert-circle-outline' : 'check-circle-outline'}
            size={16}
            color={colors.white}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 104 },
    bottomNavBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      zIndex: 10,
    },
    topNavBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.card,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    topNavBtnText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: colors.primary,
      fontWeight: WEIGHT.semibold,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerText: { flex: 1 },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      fontWeight: WEIGHT.bold,
      color: colors.primary,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: colors.lightText,
      marginTop: 2,
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.glass,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 14,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: colors.secondary,
      marginBottom: 8,
    },
    cardText: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, lineHeight: 20, color: colors.text },
    weatherRow: {
      flexDirection: 'row',
      gap: 8,
    },
    weatherPill: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    weatherText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: colors.text,
      fontWeight: WEIGHT.semibold,
    },
    selectField: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    selectTextWrap: { flex: 1, paddingRight: 10 },
    selectLabel: { fontFamily: FONT_FAMILY, fontSize: TYPE.tiny, color: colors.lightText, marginBottom: 4 },
    selectValue: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: colors.text, fontWeight: WEIGHT.bold },
    selectHint: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.lightText, marginTop: 2 },
    zoneTextWrap: { flex: 1 },
    zoneName: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.bold, color: colors.text },
    zoneNameActive: { color: colors.primary },
    zoneSoil: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.lightText, marginTop: 2 },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    primaryButtonText: { color: colors.white, fontFamily: FONT_FAMILY, fontWeight: WEIGHT.bold, fontSize: TYPE.bodySmall },
    error: { marginTop: 10, color: colors.error, fontFamily: FONT_FAMILY, fontSize: TYPE.caption },
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    countPill: {
      fontSize: TYPE.tiny,
      color: colors.secondary,
      backgroundColor: colors.pillBg,
      borderColor: colors.pillBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 9,
      fontWeight: WEIGHT.bold,
      fontFamily: FONT_FAMILY,
    },
    resultCard: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      backgroundColor: colors.glassSoft,
      padding: 10,
    },
    resultRow: { flexDirection: 'row', alignItems: 'center' },
    resultIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },
    resultTextWrap: { flex: 1 },
    resultTitle: { color: colors.text, fontFamily: FONT_FAMILY, fontWeight: WEIGHT.bold, fontSize: TYPE.bodySmall },
    resultMeta: { color: colors.lightText, fontFamily: FONT_FAMILY, fontSize: TYPE.caption, marginTop: 2 },
    resultHint: { color: colors.text, fontFamily: FONT_FAMILY, fontSize: TYPE.caption, marginTop: 4, lineHeight: 18 },
    planChipRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    planChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    planChipText: {
      marginLeft: 5,
      color: colors.secondary,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.semibold,
    },
    saveButton: {
      marginTop: 12,
      borderRadius: 12,
      paddingVertical: 10,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    saveButtonText: { color: colors.white, fontFamily: FONT_FAMILY, fontWeight: WEIGHT.bold, fontSize: TYPE.bodySmall },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.glass,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 14,
      maxHeight: 500,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.body, color: colors.secondary, fontWeight: WEIGHT.bold },
    modalOption: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.pillBg,
    },
    toast: {
      position: 'absolute',
      top: 14,
      left: 16,
      right: 16,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 30,
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    toastSuccess: {
      backgroundColor: colors.primary,
    },
    toastError: {
      backgroundColor: colors.error,
    },
    toastText: {
      marginLeft: 8,
      color: colors.white,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      flex: 1,
    },
  });

export default ManualAnalysisScreen;
