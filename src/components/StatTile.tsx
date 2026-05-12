import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

export type StatTileTone = 'neutral' | 'primary' | 'accent' | 'warning' | 'danger' | 'success';

type StatTileProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  hint?: string;
  tone?: StatTileTone;
  style?: ViewStyle;
};

const StatTile = ({ icon, value, label, hint, tone = 'neutral', style }: StatTileProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);

  return (
    <View style={[styles.tile, style]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={16} color={styles.iconColor.color as string} />
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      {!!hint && <Text style={styles.hint} numberOfLines={1}>{hint}</Text>}
    </View>
  );
};

const palettesFor = (c: ThemeColors, tone: StatTileTone) => {
  switch (tone) {
    case 'primary':
      return { iconBg: c.pillBg, iconBorder: c.pillBorder, iconColor: c.primary, accent: c.primary };
    case 'accent':
      return { iconBg: `${c.accent}22`, iconBorder: `${c.accent}55`, iconColor: c.accent, accent: c.accent };
    case 'warning':
      return { iconBg: `${c.accent}22`, iconBorder: `${c.accent}55`, iconColor: c.secondary, accent: c.secondary };
    case 'danger':
      return { iconBg: `${c.error}18`, iconBorder: `${c.error}44`, iconColor: c.error, accent: c.error };
    case 'success':
      return { iconBg: c.pillBg, iconBorder: c.pillBorder, iconColor: c.primary, accent: c.primary };
    case 'neutral':
    default:
      return { iconBg: c.iconBg, iconBorder: c.border, iconColor: c.secondary, accent: c.secondary };
  }
};

const createStyles = (c: ThemeColors, tone: StatTileTone) => {
  const p = palettesFor(c, tone);
  return StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: 0,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glass,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.sm + 2,
      gap: 4,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: p.iconBg,
      borderWidth: 1,
      borderColor: p.iconBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    iconColor: { color: p.iconColor } as any,
    value: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: c.text,
      letterSpacing: 0.2,
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      lineHeight: 13,
    },
    hint: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: p.accent,
      fontWeight: WEIGHT.semibold,
    },
  });
};

export default StatTile;
