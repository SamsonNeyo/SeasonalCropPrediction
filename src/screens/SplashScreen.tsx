import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, SafeAreaView, Animated, Easing } from 'react-native';
import { COLORS } from '../constants/colors';

const SplashScreen = () => {
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
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 28 }} />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  logo: { width: 140, height: 140, marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: COLORS.secondary, marginTop: 10, textAlign: 'center' },
  bgOrbOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E1EFE1',
    top: -40,
    right: -60,
    opacity: 0.8,
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F3EBD8',
    bottom: -40,
    left: -40,
    opacity: 0.9,
  },
});

export default SplashScreen;
