import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { predictCrops } from '../services/api';
import { savePrediction } from '../services/firestore';

const ManualAnalysisScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [season, setSeason] = useState<'First' | 'Second'>('First');
  const [soilType, setSoilType] = useState<'Loam' | 'Clay' | 'Sandy'>('Loam');
  const [temperature, setTemperature] = useState('26');
  const [rainfall, setRainfall] = useState('180');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [analysisInputs, setAnalysisInputs] = useState<any | null>(null);
  const headerIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [soilOpen, setSoilOpen] = useState(false);

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(headerIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerIn, cardIn]);

  const seasonOptions = [
    {
      label: 'First season',
      value: 'First',
      description: 'March to June (main rains)',
      icon: 'weather-cloudy',
    },
    {
      label: 'Second season',
      value: 'Second',
      description: 'August to December (short rains)',
      icon: 'weather-partly-cloudy',
    },
  ];

  const soilOptions = [
    { label: 'Loam', value: 'Loam', description: 'Balanced, moisture-retaining', icon: 'shovel' },
    { label: 'Clay', value: 'Clay', description: 'Holds water, slow drainage', icon: 'water' },
    { label: 'Sandy', value: 'Sandy', description: 'Fast drainage, airy', icon: 'grain' },
  ];

  const handleAnalyze = async () => {
    const tempValue = Number(temperature);
    const rainValue = Number(rainfall);
    try {
      setError('');
      setSaved('');
      setResult(null);
      if (!tempValue || !rainValue) {
        setError('Please enter valid temperature and rainfall values.');
        return;
      }
      setLoading(true);
      const res = await predictCrops({
        season,
        soil_type: soilType,
        temperature: tempValue,
        rainfall: rainValue,
      });
      setResult(res.recommendations || []);
      setAnalysisInputs({
        season,
        soil_type: soilType,
        temperature: tempValue,
        rainfall: rainValue,
      });
    } catch (e: any) {
      const offlineRecs = [
        { crop: 'Maize', confidence: 82 },
        { crop: 'Beans', confidence: 70 },
        { crop: 'Cassava', confidence: 65 },
      ];
      setError('Could not reach the backend. Showing offline recommendations.');
      setResult(offlineRecs);
      setAnalysisInputs({
        season,
        soil_type: soilType,
        temperature: tempValue,
        rainfall: rainValue,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysisInputs || !result) return;
    try {
      setSaved('');
      await savePrediction({
        ...analysisInputs,
        recommendations: result,
      });
      setSaved('Saved to history.');
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Sign in to save to history.';
      setSaved(`Save failed: ${msg}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerIn,
            transform: [
              {
                translateY: headerIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Manual Analysis</Text>
          <Text style={styles.subtitle}>Enter your farm conditions for tailored crop suggestions</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Farm Inputs</Text>
        <Text style={styles.sectionHint}>Choose your season and soil, then add recent conditions.</Text>

        <Text style={styles.label}>Season</Text>
        <TouchableOpacity style={styles.selectField} onPress={() => setSeasonOpen(true)}>
          <View style={styles.selectIcon}>
          <MaterialCommunityIcons name="weather-cloudy" size={18} color={colors.secondary} />
          </View>
          <View style={styles.selectText}>
            <Text style={styles.selectValue}>
              {seasonOptions.find((o) => o.value === season)?.label || 'Choose season'}
            </Text>
            <Text style={styles.selectHint}>
              {seasonOptions.find((o) => o.value === season)?.description || 'Select from the list'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
        </TouchableOpacity>

        <Text style={styles.label}>Soil Type</Text>
        <TouchableOpacity style={styles.selectField} onPress={() => setSoilOpen(true)}>
          <View style={styles.selectIcon}>
          <MaterialCommunityIcons name="shovel" size={18} color={colors.secondary} />
          </View>
          <View style={styles.selectText}>
            <Text style={styles.selectValue}>
              {soilOptions.find((o) => o.value === soilType)?.label || 'Choose soil'}
            </Text>
            <Text style={styles.selectHint}>
              {soilOptions.find((o) => o.value === soilType)?.description || 'Select from the list'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
        </TouchableOpacity>

        <Text style={styles.label}>Temperature</Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="thermometer" size={18} color={colors.secondary} />
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={temperature}
            onChangeText={setTemperature}
            placeholder="26"
            placeholderTextColor={colors.lightText}
          />
          <Text style={styles.unit}>°C</Text>
        </View>

        <Text style={styles.label}>Rainfall</Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="weather-rainy" size={18} color={colors.secondary} />
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={rainfall}
            onChangeText={setRainfall}
            placeholder="180"
            placeholderTextColor={colors.lightText}
          />
          <Text style={styles.unit}>mm</Text>
        </View>

        {!!saved && <Text style={styles.saved}>{saved}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleAnalyze} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Analyze</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [22, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>{result ? `${result.length} crops` : 'Pending'}</Text>
          </View>
        </View>
        {!result && !loading && <Text style={styles.empty}>No results yet. Run analysis to see suggestions.</Text>}
        {result?.map((r, i) => (
          <View key={i} style={styles.resultRow}>
            <View style={styles.resultIcon}>
              <MaterialCommunityIcons name="sprout" size={18} color={colors.primary} />
            </View>
            <View style={styles.resultText}>
              <Text style={styles.resultTitle}>{r.crop}</Text>
              <Text style={styles.resultSubtitle}>{r.confidence}% confidence</Text>
            </View>
          </View>
        ))}
        {result && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <MaterialCommunityIcons name="content-save-outline" size={18} color={colors.white} />
            <Text style={styles.saveButtonText}>Save Analysis</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      <SelectModal
        styles={styles}
        colors={colors}
        visible={seasonOpen}
        title="Select season"
        onClose={() => setSeasonOpen(false)}
        options={seasonOptions}
        value={season}
        onSelect={(value) => {
          setSeason(value as 'First' | 'Second');
          setSeasonOpen(false);
        }}
      />
      <SelectModal
        styles={styles}
        colors={colors}
        visible={soilOpen}
        title="Select soil type"
        onClose={() => setSoilOpen(false)}
        options={soilOptions}
        value={soilType}
        onSelect={(value) => {
          setSoilType(value as 'Loam' | 'Clay' | 'Sandy');
          setSoilOpen(false);
        }}
      />
      </ScrollView>
    </SafeAreaView>
  );
};

type SelectOption = {
  label: string;
  value: string;
  description?: string;
  icon?: string;
};

const SelectModal = ({
  visible,
  title,
  onClose,
  options,
  value,
  onSelect,
  styles,
  colors,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  styles: any;
  colors: any;
}) => {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={colors.lightText} />
            </TouchableOpacity>
          </View>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalOption, selected && styles.modalOptionActive]}
                onPress={() => onSelect(opt.value)}
              >
                <View style={styles.modalIcon}>
                  <MaterialCommunityIcons
                    name={(opt.icon as any) || 'circle-outline'}
                    size={18}
                    color={selected ? colors.primary : colors.secondary}
                  />
                </View>
                <View style={styles.modalText}>
                  <Text style={[styles.modalLabel, selected && styles.modalLabelActive]}>{opt.label}</Text>
                  {!!opt.description && <Text style={styles.modalDesc}>{opt.description}</Text>}
                </View>
                {selected && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, color: colors.lightText, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.secondary, marginBottom: 6 },
  sectionHint: { fontSize: 12, color: colors.lightText, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.secondary, marginBottom: 6 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.inputBg,
    marginBottom: 12,
  },
  selectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectText: { flex: 1 },
  selectValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  selectHint: { color: colors.lightText, fontSize: 12, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.inputBg,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 10,
    color: colors.text,
  },
  unit: { color: colors.lightText, fontWeight: '600', marginLeft: 6 },
  saved: { color: colors.secondary, marginBottom: 10 },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  saveButton: {
    marginTop: 12,
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  empty: { color: colors.lightText, fontSize: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resultText: { flex: 1 },
  resultTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  resultSubtitle: { color: colors.lightText, fontSize: 12, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionPill: {
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillBorder,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sectionPillText: { fontSize: 11, color: colors.secondary, fontWeight: '600' },
  bgAccent: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.iconBg,
    right: -80,
    top: -60,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: Platform.OS === 'web' ? 420 : 520,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.secondary },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    marginBottom: 10,
  },
  modalOptionActive: { borderColor: colors.pillBorder, backgroundColor: colors.pillBg },
  modalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalText: { flex: 1 },
  modalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalLabelActive: { color: colors.primary },
  modalDesc: { fontSize: 12, color: colors.lightText, marginTop: 2 },
});

export default ManualAnalysisScreen;
