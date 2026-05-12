import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue>({ show: () => {}, hide: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [opacity, translate]);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(options);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      const duration = options.duration ?? 3200;
      timer.current = setTimeout(hide, duration);
    },
    [hide, opacity, translate],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <SafeAreaView pointerEvents="box-none" style={styles.safeWrap}>
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.host,
              { opacity, transform: [{ translateY: translate }] },
            ]}
          >
            <View style={[styles.toast, getToneStyle(colors, toast.tone)]}>
              <MaterialCommunityIcons
                name={getToneIcon(toast.tone)}
                size={18}
                color={getToneIconColor(colors, toast.tone)}
              />
              <Text style={styles.message} numberOfLines={3}>
                {toast.message}
              </Text>
              {toast.actionLabel ? (
                <TouchableOpacity
                  onPress={() => {
                    toast.onAction?.();
                    hide();
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={toast.actionLabel}
                >
                  <Text style={styles.action}>{toast.actionLabel}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={hide} hitSlop={6} accessibilityRole="button" accessibilityLabel="Dismiss">
                  <MaterialCommunityIcons name="close" size={16} color={colors.lightText} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
};

const getToneIcon = (tone?: ToastTone): keyof typeof MaterialCommunityIcons.glyphMap => {
  switch (tone) {
    case 'success':
      return 'check-circle-outline';
    case 'warning':
      return 'alert-outline';
    case 'error':
      return 'alert-circle-outline';
    case 'info':
    default:
      return 'information-outline';
  }
};

const getToneIconColor = (c: ThemeColors, tone?: ToastTone): string => {
  switch (tone) {
    case 'success':
      return c.primary;
    case 'warning':
      return c.accent;
    case 'error':
      return c.error;
    case 'info':
    default:
      return c.secondary;
  }
};

const getToneStyle = (c: ThemeColors, tone?: ToastTone): ViewStyle => {
  switch (tone) {
    case 'success':
      return { borderColor: c.pillBorder };
    case 'warning':
      return { borderColor: c.accent };
    case 'error':
      return { borderColor: c.error };
    case 'info':
    default:
      return { borderColor: c.glassBorder };
  }
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safeWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      pointerEvents: 'box-none' as any,
    },
    host: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? SPACING.xl : SPACING.huge + SPACING.lg,
      left: SPACING.lg,
      right: SPACING.lg,
      alignItems: 'center',
    },
    toast: {
      maxWidth: 520,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: c.glass,
      borderWidth: 1,
      ...elevation(c.shadow, 'lg'),
    },
    message: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 19,
    },
    action: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.bold,
      color: c.primary,
    },
  });

export default ToastProvider;
