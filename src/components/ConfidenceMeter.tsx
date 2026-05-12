import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

type ConfidenceMeterProps = {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
  style?: ViewStyle;
};

const toneFor = (value: number, c: ThemeColors): string => {
  if (value >= 80) return c.primary;
  if (value >= 60) return c.accent;
  if (value >= 40) return c.secondary;
  return c.error;
};

const toneLabelFor = (value: number): string => {
  if (value >= 80) return 'Strong';
  if (value >= 60) return 'Good';
  if (value >= 40) return 'Moderate';
  return 'Low';
};

const ConfidenceMeter = ({
  value,
  label = 'Confidence',
  size = 'md',
  showValue = true,
  style,
}: ConfidenceMeterProps) => {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);
  const progress = useRef(new Animated.Value(0)).current;
  const fillColor = toneFor(clamped, colors);
  const toneLabel = toneLabelFor(clamped);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue && (
          <View style={styles.valueRow}>
            <Text style={[styles.toneLabel, { color: fillColor }]}>{toneLabel}</Text>
            <Text style={styles.value}>· {clamped}%</Text>
          </View>
        )}
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolated, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
};

const createStyles = (c: ThemeColors, size: 'sm' | 'md') => {
  const trackHeight = size === 'sm' ? 5 : 7;
  return StyleSheet.create({
    wrap: { width: '100%' },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    toneLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.bold,
    },
    value: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
    },
    track: {
      width: '100%',
      height: trackHeight,
      borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: RADIUS.pill,
    },
    _unused: { padding: SPACING.none },
  });
};

export default ConfidenceMeter;
