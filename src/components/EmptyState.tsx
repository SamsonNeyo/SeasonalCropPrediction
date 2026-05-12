import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

type EmptyStateProps = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'inline' | 'error';
  style?: ViewStyle;
};

const EmptyState = ({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  style,
}: EmptyStateProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  const iconColor = variant === 'error' ? colors.error : colors.primary;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} variant={variant === 'error' ? 'primary' : 'tertiary'} size="sm" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (c: ThemeColors, variant: 'default' | 'inline' | 'error') =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: variant === 'error' ? `${c.error}44` : c.glassBorder,
      backgroundColor: variant === 'error' ? `${c.error}0D` : c.glass,
      gap: SPACING.xs,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.pill,
      backgroundColor: variant === 'error' ? `${c.error}1A` : c.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: variant === 'error' ? `${c.error}33` : c.pillBorder,
    },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: c.text,
      textAlign: 'center',
    },
    description: {
      marginTop: 4,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 360,
    },
    action: { marginTop: SPACING.md },
  });

export default EmptyState;
