import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import ConfidenceMeter from './ConfidenceMeter';

type PredictionCardVariant = 'featured' | 'compact';

type PredictionCardProps = {
  prediction: any;
  variant?: PredictionCardVariant;
  rank?: number;
  onPress?: () => void;
  style?: ViewStyle;
};

const cropIconFor = (crop?: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
  const k = String(crop || '').toLowerCase();
  if (k.includes('maize') || k.includes('corn')) return 'corn';
  if (k.includes('bean') || k.includes('soybean')) return 'leaf-circle-outline';
  if (k.includes('rice') || k.includes('paddy')) return 'grain';
  if (k.includes('cassava') || k.includes('tuber')) return 'food-drumstick-outline';
  if (k.includes('coffee')) return 'coffee-outline';
  if (k.includes('tea')) return 'tea-outline';
  if (k.includes('banana') || k.includes('plantain')) return 'fruit-cherries';
  if (k.includes('groundnut') || k.includes('peanut')) return 'peanut-outline';
  if (k.includes('sweet potato')) return 'food-croissant';
  if (k.includes('potato')) return 'food-apple-outline';
  if (k.includes('tomato')) return 'fruit-cherries';
  if (k.includes('onion')) return 'food-variant';
  if (k.includes('cabbage') || k.includes('lettuce')) return 'leaf';
  if (k.includes('sorghum') || k.includes('millet')) return 'grain';
  if (k.includes('cotton')) return 'cloud-outline';
  if (k.includes('sugar')) return 'candy-outline';
  if (k.includes('sunflower')) return 'white-balance-sunny';
  if (k.includes('pineapple')) return 'fruit-pineapple';
  if (k.includes('cocoa') || k.includes('cacao')) return 'food-drumstick-outline';
  return 'sprout';
};

const PredictionCard = ({
  prediction,
  variant = 'featured',
  rank,
  onPress,
  style,
}: PredictionCardProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!prediction) return null;
  const { crop, confidence, explanation } = prediction;
  const planning = prediction?.planning;
  const actionList: string[] = Array.isArray(planning?.planning_actions) ? planning.planning_actions : [];
  const iconName = cropIconFor(crop);
  const confidenceValue = Number(confidence) || 0;
  const maxActions = variant === 'featured' ? 3 : 2;

  if (variant === 'compact') {
    const Container: any = onPress ? Pressable : View;
    return (
      <Container
        onPress={onPress}
        style={({ pressed }: any) => [
          styles.compactCard,
          onPress && pressed && styles.compactPressed,
          style,
        ]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${crop || 'Crop'} recommendation${confidence ? `, ${confidence} percent confidence` : ''}`}
      >
        <View style={styles.compactHeaderRow}>
          {typeof rank === 'number' && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          )}
          <View style={styles.compactIcon}>
            <MaterialCommunityIcons name={iconName} size={24} color={colors.primary} />
          </View>
          <View style={styles.compactBodyHead}>
            <Text style={styles.compactEyebrow}>Recommendation</Text>
            <Text style={styles.compactTitle} numberOfLines={1}>{crop || 'Crop'}</Text>
          </View>
          {!!planning?.duration_days && (
            <View style={styles.metaPill}>
              <MaterialCommunityIcons name="timer-sand" size={11} color={colors.secondary} />
              <Text style={styles.metaPillText}>{planning.duration_days}d</Text>
            </View>
          )}
        </View>

        <ConfidenceMeter value={confidenceValue} size="sm" style={styles.confidenceMeterCompact} />

        {!!explanation && (
          <Text style={styles.compactExplanation} numberOfLines={3}>
            {explanation}
          </Text>
        )}

        {!!planning?.harvest_window && (
          <View style={styles.harvestStripCompact}>
            <View style={styles.harvestIconCompact}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={12} color={colors.primary} />
            </View>
            <View style={styles.harvestBody}>
              <Text style={styles.harvestLabelCompact}>Harvest window</Text>
              <Text style={styles.harvestValueCompact} numberOfLines={1}>{planning.harvest_window}</Text>
            </View>
          </View>
        )}

        {actionList.length > 0 && (
          <View style={styles.actionsWrapCompact}>
            <Text style={styles.actionsLabel}>Next actions</Text>
            {actionList.slice(0, maxActions).map((action, idx) => (
              <View key={`${crop}-act-${idx}`} style={styles.actionRow}>
                <View style={styles.actionDot}>
                  <MaterialCommunityIcons name="check" size={10} color={colors.primary} />
                </View>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        )}
      </Container>
    );
  }

  // Featured variant
  return (
    <View style={[styles.featuredCard, style]}>
      <View style={styles.featuredAccent} />
      <View style={styles.featuredTop}>
        <View style={styles.featuredBadge}>
          <MaterialCommunityIcons name="star-four-points" size={11} color={colors.primary} />
          <Text style={styles.featuredBadgeText}>Top recommendation</Text>
        </View>
        {!!planning?.duration_days && (
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="timer-sand" size={11} color={colors.secondary} />
            <Text style={styles.metaPillText}>{planning.duration_days} days</Text>
          </View>
        )}
      </View>

      <View style={styles.featuredHero}>
        <View style={styles.featuredIcon}>
          <MaterialCommunityIcons name={iconName} size={30} color={colors.primary} />
        </View>
        <View style={styles.featuredHeroText}>
          <Text style={styles.featuredEyebrow}>Best fit this season</Text>
          <Text style={styles.featuredTitle} numberOfLines={1}>{crop || 'Crop'}</Text>
        </View>
      </View>

      <ConfidenceMeter value={confidenceValue} style={styles.confidenceMeter} />

      {!!explanation && <Text style={styles.featuredExplanation}>{explanation}</Text>}

      {!!planning?.harvest_window && (
        <View style={styles.harvestStrip}>
          <View style={styles.harvestIcon}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={14} color={colors.primary} />
          </View>
          <View style={styles.harvestBody}>
            <Text style={styles.harvestLabel}>Harvest window</Text>
            <Text style={styles.harvestValue} numberOfLines={1}>{planning.harvest_window}</Text>
          </View>
        </View>
      )}

      {actionList.length > 0 && (
        <View style={styles.actionsWrap}>
          <Text style={styles.actionsLabel}>Next actions</Text>
          {actionList.slice(0, maxActions).map((action, idx) => (
            <View key={`${crop}-act-${idx}`} style={styles.actionRow}>
              <View style={styles.actionDot}>
                <MaterialCommunityIcons name="check" size={11} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    // ── Featured ──────────────────────────────────────────────
    featuredCard: {
      backgroundColor: c.glass,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      ...elevation(c.shadow, 'lg'),
    },
    featuredAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: c.primary,
    },
    featuredTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    featuredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.pillBorder,
      backgroundColor: c.pillBg,
      borderRadius: RADIUS.pill,
      paddingVertical: 4,
      paddingHorizontal: SPACING.sm,
    },
    featuredBadgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glassSoft,
      borderRadius: RADIUS.pill,
      paddingVertical: 3,
      paddingHorizontal: SPACING.sm,
    },
    metaPillText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.semibold,
    },
    featuredHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    featuredIcon: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.lg,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuredHeroText: { flex: 1 },
    featuredEyebrow: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    featuredTitle: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      fontWeight: WEIGHT.bold,
      color: c.text,
      letterSpacing: 0.2,
    },
    confidenceMeter: { marginBottom: SPACING.md },
    featuredExplanation: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 21,
    },
    harvestStrip: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 2,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
    },
    harvestIcon: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    harvestBody: { flex: 1 },
    harvestLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    harvestValue: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      fontWeight: WEIGHT.semibold,
    },
    actionsWrap: {
      marginTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: SPACING.md,
      gap: SPACING.sm,
    },
    actionsLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
    },
    actionDot: {
      width: 18,
      height: 18,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    actionText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      lineHeight: 19,
    },

    // ── Compact (detailed secondary) ──────────────────────────
    compactCard: {
      backgroundColor: c.glass,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: SPACING.md + 2,
      marginBottom: SPACING.md,
      ...elevation(c.shadow, 'sm'),
    },
    compactPressed: { opacity: 0.85 },
    compactHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 2,
      marginBottom: SPACING.md - 2,
    },
    rankBadge: {
      minWidth: 28,
      height: 24,
      paddingHorizontal: 7,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      letterSpacing: 0.3,
    },
    compactIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactBodyHead: { flex: 1, minWidth: 0 },
    compactEyebrow: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    compactTitle: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: c.text,
      letterSpacing: 0.2,
    },
    confidenceMeterCompact: {
      marginBottom: SPACING.sm + 2,
    },
    compactExplanation: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      lineHeight: 19,
    },
    harvestStripCompact: {
      marginTop: SPACING.sm + 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm + 2,
      borderRadius: RADIUS.md - 2,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
    },
    harvestIconCompact: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    harvestLabelCompact: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    harvestValueCompact: {
      marginTop: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      fontWeight: WEIGHT.semibold,
    },
    actionsWrapCompact: {
      marginTop: SPACING.sm + 2,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: SPACING.sm + 2,
      gap: 6,
    },
  });

export default memo(PredictionCard);
