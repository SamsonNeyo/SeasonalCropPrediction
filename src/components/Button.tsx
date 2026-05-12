import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  labelStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
};

const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
}: ButtonProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  };

  const variantStyle = styles[`v_${variant}` as const] as ViewStyle;
  const variantDisabledStyle = styles[`v_${variant}_disabled` as const] as ViewStyle;
  const variantLabel = styles[`l_${variant}` as const] as TextStyle;
  const variantLabelDisabled = styles[`l_${variant}_disabled` as const] as TextStyle;
  const sizeStyle = styles[`s_${size}` as const] as ViewStyle;
  const sizeLabel = styles[`sl_${size}` as const] as TextStyle;

  const indicatorColor = (variantLabel?.color as string) || colors.white;

  return (
    <Animated.View style={[fullWidth ? styles.fullWidth : null, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : handlePressIn}
        onPressOut={isDisabled ? undefined : handlePressOut}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          sizeStyle,
          variantStyle,
          isDisabled && variantDisabledStyle,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={indicatorColor} size={size === 'sm' ? 'small' : 'small'} />
        ) : (
          <View style={styles.row}>
            {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
            <Text
              style={[styles.label, sizeLabel, variantLabel, isDisabled && variantLabelDisabled, labelStyle]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fullWidth: { width: '100%' },
    base: {
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    pressed: { opacity: 0.92 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    iconLeft: { marginRight: SPACING.sm },
    iconRight: { marginLeft: SPACING.sm },
    label: { fontFamily: FONT_FAMILY, fontWeight: WEIGHT.semibold, textAlign: 'center' },

    s_sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, minHeight: 36 },
    s_md: { paddingVertical: SPACING.md + 1, paddingHorizontal: SPACING.lg, minHeight: 46 },
    s_lg: { paddingVertical: SPACING.lg - 2, paddingHorizontal: SPACING.xl, minHeight: 52 },

    sl_sm: { fontSize: TYPE.bodySmall },
    sl_md: { fontSize: TYPE.body },
    sl_lg: { fontSize: TYPE.body, fontWeight: WEIGHT.bold },

    v_primary: { backgroundColor: c.primary, borderColor: c.primary },
    v_primary_disabled: { backgroundColor: c.iconBg, borderColor: c.iconBg },
    l_primary: { color: c.white },
    l_primary_disabled: { color: c.lightText },

    v_secondary: { backgroundColor: c.surfaceAlt, borderColor: c.primary },
    v_secondary_disabled: { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: 0.6 },
    l_secondary: { color: c.primary },
    l_secondary_disabled: { color: c.lightText },

    v_tertiary: { backgroundColor: c.glassSoft, borderColor: c.glassBorder },
    v_tertiary_disabled: { backgroundColor: c.glassSoft, borderColor: c.glassBorder, opacity: 0.6 },
    l_tertiary: { color: c.secondary },
    l_tertiary_disabled: { color: c.lightText },

    v_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    v_ghost_disabled: { backgroundColor: 'transparent', borderColor: 'transparent', opacity: 0.5 },
    l_ghost: { color: c.secondary },
    l_ghost_disabled: { color: c.lightText },

    v_danger: { backgroundColor: c.error, borderColor: c.error },
    v_danger_disabled: { backgroundColor: c.error, borderColor: c.error, opacity: 0.5 },
    l_danger: { color: c.white },
    l_danger_disabled: { color: c.white },
  });

export default Button;
