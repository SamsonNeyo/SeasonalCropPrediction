import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { RADIUS } from '../constants/spacing';
import { elevation } from '../constants/elevation';

export type IconButtonVariant = 'soft' | 'solid' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle | ViewStyle[];
};

const SIZE_MAP: Record<IconButtonSize, { container: number; icon: number }> = {
  sm: { container: 32, icon: 16 },
  md: { container: 38, icon: 18 },
  lg: { container: 46, icon: 22 },
};

const IconButton = ({
  icon,
  onPress,
  variant = 'soft',
  size = 'md',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: IconButtonProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);
  const scale = useRef(new Animated.Value(1)).current;
  const dims = SIZE_MAP[size];

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  };

  const iconColor = disabled ? colors.lightText : (styles.iconColor.color as string);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        hitSlop={6}
        style={[
          styles.base,
          { width: dims.container, height: dims.container },
          disabled && styles.disabled,
        ]}
      >
        <MaterialCommunityIcons name={icon} size={dims.icon} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (c: ThemeColors, variant: IconButtonVariant) => {
  const palette = (() => {
    switch (variant) {
      case 'solid':
        return { bg: c.primary, border: c.primary, icon: c.white, shadow: 'md' as const };
      case 'ghost':
        return { bg: 'transparent', border: 'transparent', icon: c.secondary, shadow: 'none' as const };
      case 'danger':
        return { bg: `${c.error}15`, border: `${c.error}40`, icon: c.error, shadow: 'none' as const };
      case 'soft':
      default:
        return { bg: c.card, border: c.border, icon: c.primary, shadow: 'sm' as const };
    }
  })();

  return StyleSheet.create({
    base: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation(c.shadow, palette.shadow),
    },
    disabled: { opacity: 0.5 },
    iconColor: { color: palette.icon } as any,
  });
};

export default IconButton;
