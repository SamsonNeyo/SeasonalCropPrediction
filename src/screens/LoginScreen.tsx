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

const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    try {
      setError('');
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
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
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your SmartCrop account</Text>
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
                  placeholder="Enter your password"
                  placeholderTextColor={colors.lightText}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  autoComplete="password"
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
            </View>

            {/* ── Forgot ── */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
              style={styles.forgotRow}
              hitSlop={8}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* ── Error ── */}
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Sign In ── */}
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                (!email.trim() || !password) && styles.btnMuted,
                pressed && { opacity: 0.88 },
              ]}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Sign In</Text>
              }
            </Pressable>

            {/* ── Create account ── */}
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{'  '}
                <Text style={styles.footerAccent}>Sign up</Text>
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
    input: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.text,
      height: '100%',
      ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
    },
    inputFlex: { flex: 1 },

    // Forgot
    forgotRow: { alignItems: 'flex-end', marginTop: -4, marginBottom: SPACING.lg },
    forgotText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.primary,
      fontWeight: WEIGHT.semibold,
    },

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

    // Footer
    footer: { alignItems: 'center', paddingVertical: SPACING.sm },
    footerText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
    },
    footerAccent: {
      color: c.primary,
      fontWeight: WEIGHT.bold,
    },
  });

export default LoginScreen;
