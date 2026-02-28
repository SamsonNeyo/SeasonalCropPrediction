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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';

const HIGHLIGHTS = [
  { icon: 'map-marker-radius-outline', label: 'Sub-county based recommendations' },
  { icon: 'weather-partly-cloudy', label: 'Season-focused planning for Luwero' },
  { icon: 'history', label: 'Save and review your prediction history' },
];

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
      <Animated.View pointerEvents="none" style={[styles.bgLeaf, { transform: [{ translateY: bgShift }] }]} />
      <Animated.View pointerEvents="none" style={[styles.bgSun, { transform: [{ translateY: bgShift }] }]} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.card,
            { opacity: cardIn, transform: [{ translateY: cardTranslate }, { scale: cardScale }] },
          ]}
        >
          <View style={styles.topAccentBar} />
          <View style={styles.brandColumn}>
            <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
            <Text style={styles.title}>SmartCrop</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Luwero Crop Planner</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Plan smarter before you plant</Text>
          <Text style={styles.description}>
            Get practical crop recommendations based on your selected sub-county and current planting season.
          </Text>

          <View style={styles.highlightList}>
            {HIGHLIGHTS.map((item) => (
              <View key={item.label} style={styles.highlightRow}>
                <View style={styles.highlightIcon}>
                  <MaterialCommunityIcons name={item.icon as any} size={15} color={colors.secondary} />
                </View>
                <Text style={styles.highlightText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.primaryButton,
              hovered && styles.primaryButtonHover,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.secondaryButton,
              hovered && styles.secondaryButtonHover,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
          <Text style={styles.footerNote}>For farmers and agribusiness users in and around Luwero District.</Text>
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
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : undefined,
    backgroundColor: colors.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 5,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginBottom: 14,
    opacity: 0.9,
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
    fontSize: TYPE.bodySmall,
    fontWeight: WEIGHT.semibold,
    color: colors.lightText,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.bodySmall,
    color: colors.text,
    marginBottom: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  highlightList: {
    marginBottom: 18,
    gap: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
  },
  highlightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  highlightText: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    color: colors.text,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.semibold,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonHover: {
    opacity: 0.93,
    transform: [{ translateY: -1 }],
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ translateY: 0 }],
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
  secondaryButtonHover: {
    backgroundColor: colors.pillBg,
  },
  secondaryButtonPressed: {
    opacity: 0.88,
  },
  secondaryButtonText: {
    fontFamily: FONT_FAMILY,
    color: colors.primary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.semibold,
  },
  footerNote: {
    marginTop: 12,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.tiny,
    color: colors.lightText,
    textAlign: 'center',
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
