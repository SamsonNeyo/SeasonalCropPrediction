import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const SLIDES = [
  {
    icon: 'sprout' as const,
    title: 'Smart crop predictions',
    body: 'Get ranked crop recommendations tailored to your sub-county, soil type, and current season — updated every planting cycle.',
    accent: '#3CB371',
  },
  {
    icon: 'brain' as const,
    title: 'AI farming advisor',
    body: 'Ask any farming question and get instant, expert-level guidance on pests, irrigation, harvest timing, and cost savings.',
    accent: '#4A90D9',
  },
  {
    icon: 'history' as const,
    title: 'Track your seasons',
    body: 'Every prediction is saved so you can compare seasons, review past advice, and see how your farm decisions improve over time.',
    accent: '#E07B39',
  },
];

const OnboardingScreen = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, 500);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { updateUserData } = useAuth();
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const dotScales = useRef(SLIDES.map(() => new Animated.Value(1))).current;

  const goTo = useCallback(
    (index: number) => {
      Animated.timing(translateX, {
        toValue: -index * slideWidth,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // Pulse the target dot
      Animated.sequence([
        Animated.timing(dotScales[index], { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(dotScales[index], { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setCurrent(index);
    },
    [translateX, slideWidth, dotScales],
  );

  const finish = useCallback(async () => {
    setSaving(true);
    try {
      await updateUserData({ onboardingComplete: true });
    } catch {
      setSaving(false);
    }
  }, [updateUserData]);

  const handleNext = useCallback(() => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      finish();
    }
  }, [current, goTo, finish]);

  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />

      {/* Skip */}
      <View style={styles.topBar}>
        {!isLast && (
          <TouchableOpacity
            onPress={finish}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides viewport */}
      <View style={[styles.slidesViewport, { width: slideWidth }]}>
        <Animated.View style={[styles.slidesRow, { transform: [{ translateX }] }]}>
          {SLIDES.map((slide, i) => (
            <View key={i} style={[styles.slide, { width: slideWidth }]}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${slide.accent}18`, borderColor: `${slide.accent}35` },
                ]}
              >
                <MaterialCommunityIcons name={slide.icon} size={52} color={slide.accent} />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === current && [styles.dotActive, { backgroundColor: slide.accent }],
              { transform: [{ scale: dotScales[i] }] },
            ]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={isLast ? 'Get started' : 'Next'}
          onPress={handleNext}
          loading={saving}
          fullWidth
          size="lg"
          rightIcon={
            !isLast ? (
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.white} />
            ) : undefined
          }
        />
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>
            {current + 1} of {SLIDES.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      paddingBottom: SPACING.xl,
    },
    bgAccent: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: c.iconBg,
      right: -70,
      top: -70,
      opacity: 0.55,
    },
    topBar: {
      width: '100%',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
      alignItems: 'flex-end',
      minHeight: 44,
    },
    skipBtn: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
    },
    skipText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.lightText,
      letterSpacing: 0.3,
    },
    slidesViewport: {
      flex: 1,
      overflow: 'hidden',
    },
    slidesRow: {
      flexDirection: 'row',
      flex: 1,
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
      gap: SPACING.lg,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 36,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    slideTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      fontWeight: WEIGHT.bold,
      color: c.text,
      textAlign: 'center',
      lineHeight: 32,
    },
    slideBody: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.lightText,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    dots: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingVertical: SPACING.xl,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    dotActive: {
      width: 28,
      borderRadius: 4,
    },
    actions: {
      width: '100%',
      paddingHorizontal: SPACING.xxl,
      gap: SPACING.sm,
    },
    stepIndicator: {
      alignItems: 'center',
      paddingVertical: SPACING.xs,
    },
    stepText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      letterSpacing: 0.4,
    },
  });

export default OnboardingScreen;
