import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  Platform,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { useAuth } from '../context/AuthContext';

type StrengthInfo = { bars: number; label: string; color: string };

const getStrength = (pwd: string): StrengthInfo | null => {
  if (!pwd) return null;
  if (pwd.length < 6) return { bars: 1, label: 'Weak — please add more strength!', color: '#EF4444' };
  if (pwd.length < 8)  return { bars: 2, label: 'Fair — try adding numbers or symbols', color: '#F97316' };
  if (pwd.length < 10) return { bars: 3, label: 'Good — almost there!', color: '#EAB308' };
  return { bars: 4, label: 'Strong password', color: '#22C55E' };
};

const SignupScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signup, loginWithGoogle, googleAuthSupported } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const strength = getStrength(password);
  const passwordMismatch = !!confirmPassword && confirmPassword !== password;
  const disableSubmit = !name.trim() || !email.trim() || !password || !confirmPassword || !acceptTerms;

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.'); return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!acceptTerms) { setError('Please accept the terms to continue.'); return; }
    try {
      setError('');
      setLoading(true);
      await signup(email.trim(), password, name.trim() || 'Farmer');
    } catch (e: any) {
      setError(e?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      await loginWithGoogle();
    } catch (e: any) {
      const msg = e?.message || 'Google sign-in failed.';
      if (!/cancel/i.test(msg)) setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* ── Brand ── */}
            <View style={styles.brand}>
              <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Get personalized crop guidance for your farm</Text>
            </View>

            {/* ── Full name ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="account-outline" size={18} color={colors.lightText} />
                <TextInput
                  style={styles.input}
                  placeholder="Jane Farmer"
                  placeholderTextColor={colors.lightText}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* ── Email ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="email-outline" size={18} color={colors.lightText} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.lightText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* ── Password ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={colors.lightText} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.lightText}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.lightText}
                  />
                </Pressable>
              </View>

              {/* Strength bar */}
              {strength && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: i <= strength.bars ? strength.color : colors.border },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Confirm password ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm your password</Text>
              <View style={[styles.inputRow, passwordMismatch && styles.inputRowError]}>
                <MaterialCommunityIcons name="lock-check-outline" size={18} color={colors.lightText} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.lightText}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={10}>
                  <MaterialCommunityIcons
                    name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.lightText}
                  />
                </Pressable>
              </View>
              {passwordMismatch && (
                <Text style={styles.fieldError}>Passwords do not match</Text>
              )}
            </View>

            {/* ── Terms ── */}
            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptTerms(v => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptTerms }}
              hitSlop={6}
            >
              <View style={[
                styles.checkbox,
                acceptTerms && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}>
                {acceptTerms && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsAccent}>Terms</Text> and{' '}
                <Text style={styles.termsAccent}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* ── Error ── */}
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Create account ── */}
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                disableSubmit && styles.btnMuted,
                pressed && !disableSubmit && { opacity: 0.88 },
              ]}
              onPress={handleSignup}
              disabled={loading || disableSubmit}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </Pressable>

            {/* ── Google ── */}
            {googleAuthSupported && (
              <>
                <View style={styles.divider}>
                  <View style={styles.divLine} />
                  <Text style={styles.divText}>Or</Text>
                  <View style={styles.divLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.82 }]}
                  onPress={handleGoogleSignup}
                  disabled={googleLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  {googleLoading
                    ? <ActivityIndicator color={colors.text} size="small" />
                    : (
                      <>
                        <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                        <Text style={styles.googleText}>Continue with Google</Text>
                      </>
                    )
                  }
                </Pressable>
              </>
            )}

            {/* ── Sign in link ── */}
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{'  '}
                <Text style={styles.footerAccent}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.xxl,
    },
    inner: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 420 : undefined,
      alignSelf: 'center',
    },

    // Brand
    brand: { alignItems: 'center', marginBottom: SPACING.xl + 8 },
    logo: { width: 76, height: 76, borderRadius: 20, marginBottom: SPACING.md },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: 26,
      fontWeight: WEIGHT.bold,
      color: c.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
    },

    // Fields
    field: { marginBottom: SPACING.md },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingHorizontal: SPACING.md,
      height: 54,
      gap: SPACING.sm,
    },
    inputRowError: {
      borderWidth: 1.5,
      borderColor: c.error,
    },
    input: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.text,
      height: '100%',
      ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
    },
    inputFlex: { flex: 1 },

    // Strength
    strengthWrap: { marginTop: 8 },
    strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    strengthBar: { flex: 1, height: 3, borderRadius: 2 },
    strengthLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
    },
    fieldError: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.error,
      marginTop: 4,
    },

    // Terms
    termsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    termsText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
    },
    termsAccent: { color: c.primary, fontWeight: WEIGHT.semibold },

    // Error
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: 10,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: `${c.error}12`,
      borderWidth: 1,
      borderColor: `${c.error}30`,
      marginBottom: SPACING.md,
    },
    errorText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.error,
      fontWeight: WEIGHT.semibold,
    },

    // Primary button
    btn: {
      height: 54,
      backgroundColor: c.primary,
      borderRadius: RADIUS.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnMuted: { opacity: 0.5 },
    btnText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: '#fff',
      letterSpacing: 0.2,
    },

    // Divider
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginVertical: SPACING.lg,
    },
    divLine: { flex: 1, height: 1, backgroundColor: c.border },
    divText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
    },

    // Google
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 54,
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.background,
      marginBottom: SPACING.lg,
    },
    googleText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },

    // Footer
    footer: { alignItems: 'center', paddingVertical: SPACING.sm },
    footerText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
    },
    footerAccent: { color: c.primary, fontWeight: WEIGHT.bold },
  });

export default SignupScreen;
