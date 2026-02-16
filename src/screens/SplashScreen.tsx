import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const SplashScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeIn, rise, pulse]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: rise }] }]}>
        <Animated.Image
          source={require('../../assets/splash-icon.png')}
          style={[styles.logo, { transform: [{ scale: pulse }] }]}
        />
        <Text style={styles.title}>SmartCrop</Text>
        <Text style={styles.subtitle}>Smart farming for every season</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 28 }} />
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  logo: { width: 96, height: 96, marginBottom: 20 },
  title: { fontFamily: FONT_FAMILY, fontSize: TYPE.display, fontWeight: WEIGHT.bold, color: colors.primary, letterSpacing: 0.5 },
  subtitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.body, color: colors.secondary, marginTop: 10, textAlign: 'center', opacity: 0.9 },
  bgOrbOne: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: colors.iconBg,
    top: -55,
    right: -75,
    opacity: 0.82,
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.pillBg,
    bottom: -50,
    left: -50,
    opacity: 0.9,
  },
});

export default SplashScreen;
