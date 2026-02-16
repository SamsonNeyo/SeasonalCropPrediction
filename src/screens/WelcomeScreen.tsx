import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const WelcomeScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardIn = useRef(new Animated.Value(0)).current;
  const bgFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardIn, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgFloat, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bgFloat, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [cardIn, bgFloat]);

  const cardTranslate = cardIn.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const cardScale = cardIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const bgShift = bgFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.bgLeaf, { transform: [{ translateY: bgShift }] }]} />
      <Animated.View style={[styles.bgSun, { transform: [{ translateY: bgShift }] }]} />
      <Animated.View
        style={[
          styles.card,
          { opacity: cardIn, transform: [{ translateY: cardTranslate }, { scale: cardScale }] },
        ]}
      >
        <View style={styles.brandColumn}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
          <Text style={styles.title}>SmartCrop</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Season-smart guidance</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Grow with better decisions</Text>
        <Text style={styles.description}>
          Get crop recommendations tailored to your season, soil, and weather. Use AI-powered insights to
          plan what to plant and track your history as you grow.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    shadowColor: colors.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    alignSelf: 'center',
  },
  brandColumn: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.display,
    fontWeight: WEIGHT.bold,
    color: colors.primary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.semibold,
    color: colors.lightText,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
    color: colors.text,
    marginBottom: 28,
    lineHeight: 22,
    textAlign: 'justify',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: FONT_FAMILY,
    color: colors.white,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.semibold,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonText: {
    fontFamily: FONT_FAMILY,
    color: colors.primary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.semibold,
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: colors.pillBg,
    borderWidth: 1,
    borderColor: colors.pillBorder,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  pillText: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.secondary, fontWeight: WEIGHT.semibold },
  bgLeaf: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.iconBg,
    left: -95,
    top: -70,
    opacity: 0.85,
  },
  bgSun: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: colors.pillBg,
    right: -70,
    bottom: -50,
    opacity: 0.85,
  },
});

export default WelcomeScreen;
