import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const PredictionCard = ({ prediction }: { prediction: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!prediction) return null;
  const { crop, confidence, explanation } = prediction;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="sprout" size={18} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{crop || 'Crop'}</Text>
          <View style={styles.confidencePill}>
            <Text style={styles.subtitle}>{confidence ? `${confidence}% confidence` : 'Recommended'}</Text>
          </View>
        </View>
      </View>
      {!!explanation && <Text style={styles.explanation}>{explanation}</Text>}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  text: { flex: 1 },
  title: { fontFamily: FONT_FAMILY, fontSize: TYPE.body, fontWeight: WEIGHT.bold, color: colors.text },
  confidencePill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillBorder,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  subtitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.secondary, fontWeight: WEIGHT.semibold },
  explanation: {
    marginTop: 10,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
});

export default PredictionCard;
