import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import TextField from '../components/TextField';
import IconButton from '../components/IconButton';

const RESEND_COOLDOWN_SECONDS = 30;

const ForgotPasswordScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const headerIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(headerIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerIn, cardIn]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isValidEmail = useMemo(() => {
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [email]);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!isValidEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await resetPassword(trimmed);
      setSubmittedEmail(trimmed);
      setSubmitted(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !submittedEmail) return;
    try {
      setError('');
      setLoading(true);
      await resetPassword(submittedEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e: any) {
      setError(e?.message || 'Could not resend reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.topBar}>
        <IconButton
          icon="arrow-left"
          variant="soft"
          size="md"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.panel,
            {
              opacity: cardIn,
              transform: [
                { translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              ],
            },
          ]}
        >
          <View pointerEvents="none" style={styles.cornerTopLeft} />
          <View pointerEvents="none" style={styles.cornerBottomRight} />
          <View style={styles.panelAccent} />

          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerIn,
                transform: [
                  { translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                ],
              },
            ]}
          >
            {submitted ? (
              <View style={styles.successIcon}>
                <MaterialCommunityIcons name="email-check-outline" size={32} color={colors.primary} />
              </View>
            ) : (
              <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
            )}
            <Text style={styles.eyebrow}>{submitted ? 'Check your email' : 'Reset password'}</Text>
            <Text style={styles.title}>
              {submitted ? 'Email sent' : 'Forgot password?'}
            </Text>
            <Text style={styles.subtitle}>
              {submitted
                ? `If an account exists for ${submittedEmail}, a reset link has been sent. Follow the link to set a new password.`
                : 'Enter the email associated with your account and we’ll send you a link to reset your password.'}
            </Text>
          </Animated.View>

          {!submitted ? (
            <>
              <TextField
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError('');
                }}
                leftIcon={<MaterialCommunityIcons name="email-outline" size={18} color={colors.lightText} />}
                accessibilityLabel="Email"
                error={error || undefined}
              />

              <Button
                label="Send reset link"
                onPress={handleSubmit}
                loading={loading}
                disabled={!isValidEmail}
                fullWidth
                size="lg"
                style={styles.submitBtn}
                accessibilityLabel="Send password reset link"
              />

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.linkBtn}
                accessibilityRole="link"
                accessibilityLabel="Back to sign in"
                hitSlop={6}
              >
                <Text style={styles.link}>
                  Remembered it? <Text style={styles.linkAccent}>Back to sign in</Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={colors.secondary} />
                  <Text style={styles.tipsTitle}>Didn’t receive it?</Text>
                </View>
                <View style={styles.tipsList}>
                  <TipItem text="Check your spam or junk folder." colors={colors} />
                  <TipItem text="Make sure the email address is spelled correctly." colors={colors} />
                  <TipItem text="It can take a minute or two to arrive." colors={colors} />
                </View>
              </View>

              {!!error && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <Button
                label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
                variant="secondary"
                onPress={handleResend}
                loading={loading}
                disabled={cooldown > 0}
                fullWidth
                size="lg"
                leftIcon={
                  cooldown > 0 ? undefined : (
                    <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
                  )
                }
                style={styles.submitBtn}
                accessibilityLabel="Resend password reset email"
              />

              <Button
                label="Back to sign in"
                variant="tertiary"
                onPress={() => navigation.navigate('Login')}
                fullWidth
                style={styles.tertiaryBtn}
                accessibilityLabel="Back to sign in"
              />

              <TouchableOpacity
                onPress={() => {
                  setSubmitted(false);
                  setError('');
                }}
                style={styles.linkBtn}
                accessibilityRole="link"
                accessibilityLabel="Use a different email"
                hitSlop={6}
              >
                <Text style={styles.link}>
                  Wrong email? <Text style={styles.linkAccent}>Use a different one</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const TipItem = ({ text, colors }: { text: string; colors: ThemeColors }) => {
  const styles = useMemo(() => tipStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const tipStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    dot: {
      width: 5,
      height: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
      marginTop: 8,
    },
    text: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      lineHeight: 19,
    },
  });

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topBar: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    scrollContent: {
      flexGrow: 1,
      padding: SPACING.xxl,
      paddingTop: SPACING.lg,
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    panel: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 440 : undefined,
      marginVertical: 'auto',
      backgroundColor: c.glass,
      borderRadius: RADIUS.xxl,
      borderWidth: 1,
      borderColor: c.glassBorder,
      paddingHorizontal: SPACING.xxl - 2,
      paddingVertical: SPACING.xxl,
      alignSelf: 'center',
      ...elevation(c.shadow, 'lg'),
    },
    panelAccent: {
      width: 48,
      height: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: c.accent,
      alignSelf: 'center',
      marginBottom: SPACING.lg,
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
      borderColor: c.primary,
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
      borderColor: c.primary,
      borderBottomRightRadius: 14,
      opacity: 0.9,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl + 4,
    },
    logo: { width: 80, height: 80, marginBottom: SPACING.md },
    successIcon: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    eyebrow: {
      fontFamily: FONT_FAMILY,
      color: c.secondary,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.title,
      fontWeight: WEIGHT.bold,
      color: c.primary,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 340,
    },
    submitBtn: { marginTop: SPACING.xs },
    tertiaryBtn: { marginTop: SPACING.sm + 2 },
    tipsCard: {
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glassSoft,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    tipsTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.bold,
      color: c.secondary,
    },
    tipsList: { gap: SPACING.xs + 2 },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: `${c.error}15`,
      borderWidth: 1,
      borderColor: `${c.error}40`,
      marginBottom: SPACING.md,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      color: c.error,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
    },
    linkBtn: { marginTop: SPACING.lg, alignItems: 'center' },
    link: {
      fontFamily: FONT_FAMILY,
      color: c.lightText,
      fontSize: TYPE.bodySmall,
    },
    linkAccent: {
      color: c.secondary,
      fontWeight: WEIGHT.bold,
    },
    bgOrbOne: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.iconBg,
      top: -60,
      right: -80,
      opacity: 0.85,
    },
    bgOrbTwo: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: c.pillBg,
      bottom: -60,
      left: -70,
      opacity: 0.75,
    },
  });

export default ForgotPasswordScreen;
