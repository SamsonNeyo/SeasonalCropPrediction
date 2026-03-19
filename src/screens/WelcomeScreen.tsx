import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const WelcomeScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const contentIn = useRef(new Animated.Value(0)).current;
  const bgFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentIn, {
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
  }, [contentIn, bgFloat]);

  const contentTranslate = contentIn.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const contentScale = contentIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const bgShift = bgFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.bgLeaf, { transform: [{ translateY: bgShift }] }]} />
      <Animated.View pointerEvents="none" style={[styles.bgSun, { transform: [{ translateY: bgShift }] }]} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.panel,
            { opacity: contentIn, transform: [{ translateY: contentTranslate }, { scale: contentScale }] },
          ]}
        >
          <View pointerEvents="none" style={styles.cornerTopLeft} />
          <View pointerEvents="none" style={styles.cornerBottomRight} />
          <View style={styles.panelAccent} />
          <View style={styles.brandColumn}>
            <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
            <Text style={styles.eyebrow}>Smart farming assistant</Text>
            <Text style={styles.title}>SmartCrop</Text>
          </View>
          <Text style={styles.subtitle}>Crop planning for Luwero District.</Text>
          <Text style={styles.description}>Sign in to access recommendations, analysis, and farm history.</Text>

          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 20,
  },
  panel: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : undefined,
    backgroundColor: colors.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  panelAccent: {
    width: 56,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignSelf: 'center',
    marginBottom: 18,
    opacity: 0.9,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 26,
    height: 26,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.primary,
    borderTopLeftRadius: 14,
    opacity: 0.9,
  },
  cornerBottomRight: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 26,
    height: 26,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary,
    borderBottomRightRadius: 14,
    opacity: 0.9,
  },
  brandColumn: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 92,
    height: 92,
    marginBottom: 14,
  },
  eyebrow: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.semibold,
    color: colors.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
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
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.bodySmall,
    color: colors.lightText,
    marginBottom: 28,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
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
