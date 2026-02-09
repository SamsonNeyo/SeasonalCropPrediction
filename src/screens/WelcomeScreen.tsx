import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { COLORS } from '../constants/colors';

const WelcomeScreen = ({ navigation }: any) => {
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
        <View style={styles.brandRow}>
          <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
          <View style={styles.brandText}>
            <Text style={styles.title}>SmartCrop</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Season-smart guidance</Text>
            </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 72,
    height: 72,
    marginRight: 12,
  },
  brandText: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.lightText,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 28,
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F7FBF7',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F7ED',
    borderWidth: 1,
    borderColor: '#D9E6D1',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  pillText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  bgLeaf: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E6F1E6',
    left: -90,
    top: -60,
    opacity: 0.9,
  },
  bgSun: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F7E8C8',
    right: -70,
    bottom: -40,
    opacity: 0.8,
  },
});

export default WelcomeScreen;
