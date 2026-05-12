import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { RADIUS } from '../constants/spacing';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

const Skeleton = ({ width = '100%', height = 14, borderRadius = RADIUS.sm, style }: SkeletonProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={[styles.wrap, { width, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: colors.surfaceAlt, borderRadius }]} />
    </View>
  );
};

export const SkeletonGroup = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  return <View style={[{ gap: 10 }, style]}>{children}</View>;
};

const createStyles = (c: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.glassSoft,
      overflow: 'hidden',
    },
  });

export default Skeleton;
