import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type ChipProps = {
  label: string;
  tone?: ChipTone;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

const Chip = ({ label, tone = 'neutral', icon, size = 'md', style }: ChipProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark, tone), [colors, isDark, tone]);
  const sizeStyle = size === 'sm' ? styles.sm : styles.md;
  const iconColor = styles.label.color as string;

  return (
    <View style={[styles.base, sizeStyle, style]}>
      {icon ? <MaterialCommunityIcons name={icon} size={size === 'sm' ? 12 : 14} color={iconColor} /> : null}
      <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const tonePalette = (c: ThemeColors, isDark: boolean, tone: ChipTone) => {
  switch (tone) {
    case 'success':
      return {
        bg: c.pillBg,
        border: c.pillBorder,
        text: c.primary,
      };
    case 'warning':
      return {
        bg: isDark ? '#3B2D13' : '#F3EEE2',
        border: isDark ? '#6A5320' : '#D8C59A',
        text: isDark ? '#F3E3BA' : '#7A5B14',
      };
    case 'danger':
      return {
        bg: isDark ? '#4A1F1C' : '#F9E6E3',
        border: isDark ? '#7A2E2A' : '#E6B1A8',
        text: isDark ? '#F6D6D2' : '#8E2A22',
      };
    case 'info':
      return {
        bg: isDark ? '#173043' : '#E4EEF7',
        border: isDark ? '#274860' : '#BCD3E5',
        text: isDark ? '#CFE3F3' : '#1F4F77',
      };
    case 'neutral':
    default:
      return {
        bg: c.iconBg,
        border: c.glassBorder,
        text: c.secondary,
      };
  }
};

const createStyles = (c: ThemeColors, isDark: boolean, tone: ChipTone) => {
  const palette = tonePalette(c, isDark, tone);
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      alignSelf: 'flex-start',
    },
    sm: { paddingVertical: 3, paddingHorizontal: SPACING.sm },
    md: { paddingVertical: 5, paddingHorizontal: SPACING.md - 2 },
    label: {
      fontFamily: FONT_FAMILY,
      fontWeight: WEIGHT.semibold,
      color: palette.text,
    },
    labelSm: { fontSize: TYPE.tiny },
    labelMd: { fontSize: TYPE.caption },
  });
};

export default Chip;
