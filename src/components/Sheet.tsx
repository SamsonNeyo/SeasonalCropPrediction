import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  variant?: 'bottom' | 'center';
  maxWidth?: number;
  showCloseButton?: boolean;
  contentStyle?: ViewStyle;
};

const Sheet = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  variant = 'bottom',
  maxWidth = 480,
  showCloseButton = true,
  contentStyle,
}: SheetProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'bottom' ? [40, 0] : [16, 0],
  });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const opacity = anim;

  const containerAlign: ViewStyle =
    variant === 'bottom' ? { justifyContent: 'flex-end' } : { justifyContent: 'center', alignItems: 'center' };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, containerAlign]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <Animated.View
          style={[
            variant === 'bottom' ? styles.bottomCard : styles.centerCard,
            variant === 'center' ? { maxWidth } : null,
            {
              opacity,
              transform: variant === 'bottom' ? [{ translateY }] : [{ translateY }, { scale }],
            },
            contentStyle,
          ]}
        >
          {variant === 'bottom' && <View style={styles.handle} />}
          {(title || subtitle || showCloseButton) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {!!title && <Text style={styles.title}>{title}</Text>}
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="close" size={20} color={colors.lightText} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.4)',
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: SPACING.md,
      opacity: 0.6,
    },
    bottomCard: {
      backgroundColor: c.glass,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xxl,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: c.glassBorder,
      maxHeight: '85%',
      ...elevation(c.shadow, 'xl'),
    },
    centerCard: {
      width: '92%',
      backgroundColor: c.glass,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: SPACING.lg,
      ...elevation(c.shadow, 'xl'),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    headerText: { flex: 1 },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: c.secondary,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.md,
      backgroundColor: c.glassSoft,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default Sheet;
