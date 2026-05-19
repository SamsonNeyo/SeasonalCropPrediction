import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

const SplashScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

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

    const pulseLoop = Animated.loop(
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
      ]),
    );
    pulseLoop.start();

    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    );
    progressLoop.start();

    return () => {
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [fadeIn, rise, pulse, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['18%', '85%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: rise }] }]}>
        <Animated.Image
          source={require('../../assets/splash-icon.png')}
          style={[styles.logo, { transform: [{ scale: pulse }] }]}
        />
        <Text style={styles.title}>SmartCrop</Text>
        <Text style={styles.subtitle}>Smart farming for every season</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: { alignItems: 'center', paddingHorizontal: SPACING.xxl },
    logo: { width: 96, height: 96, marginBottom: SPACING.xl },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.display,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.secondary,
      marginTop: SPACING.sm + 2,
      textAlign: 'center',
      opacity: 0.9,
    },
    progressTrack: {
      marginTop: SPACING.xxl + 4,
      width: 180,
      height: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
    },
    bgOrbOne: {
      position: 'absolute',
      width: 270,
      height: 270,
      borderRadius: 135,
      backgroundColor: c.iconBg,
      top: -55,
      right: -75,
      opacity: 0.82,
    },
    bgOrbTwo: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.pillBg,
      bottom: -50,
      left: -50,
      opacity: 0.9,
    },
  });

export default SplashScreen;
