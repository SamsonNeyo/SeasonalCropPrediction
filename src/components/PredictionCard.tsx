import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const PredictionCard = ({ prediction }: { prediction: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!prediction) return null;
  const { crop, confidence, explanation } = prediction;
  const planning = prediction?.planning;
  const actionList: string[] = Array.isArray(planning?.planning_actions) ? planning.planning_actions : [];

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
      {!!planning && (
        <View style={styles.planWrap}>
          <View style={styles.planRow}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={15} color={colors.secondary} />
            <Text style={styles.planText}>Harvest window: {planning.harvest_window}</Text>
          </View>
          <View style={styles.planRow}>
            <MaterialCommunityIcons name="timer-sand" size={15} color={colors.secondary} />
            <Text style={styles.planText}>Growth period: {planning.duration_days} days</Text>
          </View>
          {actionList.slice(0, 2).map((action, idx) => (
            <View key={`${crop}-action-${idx}`} style={styles.planRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={15} color={colors.secondary} />
              <Text style={styles.planText}>{action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
  planWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 6,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planText: {
    marginLeft: 6,
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.caption,
    color: colors.text,
    lineHeight: 18,
  },
});

export default memo(PredictionCard);
