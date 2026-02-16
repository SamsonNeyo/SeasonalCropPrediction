import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/Topography';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
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

  const handleLogin = async () => {
    try {
      setError('');
      setInfo('');
      if (!email.trim() || !password) {
        setError('Email and password are required.');
        return;
      }
      setLoading(true);
      await login(email.trim(), password);
      if (rememberMe) {
        setInfo('You will stay signed in on this device.');
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError('');
      setInfo('');
      if (!email.trim()) {
        setError('Enter your email to reset your password.');
        return;
      }
      setLoading(true);
      await resetPassword(email.trim());
      setInfo('If an account exists for this email, a reset link has been sent.');
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  const disableLogin = loading || !email.trim() || !password;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerIn,
            transform: [
              {
                translateY: headerIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Image source={require('../../assets/splash-icon.png')} style={styles.logo} />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.lightText}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={colors.lightText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowBetween}>
          <Pressable style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} />
            <Text style={styles.checkboxText}>Remember me</Text>
          </Pressable>
          <TouchableOpacity onPress={handleResetPassword}>
            <Text style={styles.linkInline}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, disableLogin && styles.primaryButtonDisabled]}
          onPress={handleLogin}
          disabled={disableLogin}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>No account? Create one</Text>
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
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logo: {
      width: 96,
      height: 96,
      marginBottom: 12,
    },
    brandName: { fontFamily: FONT_FAMILY, fontSize: TYPE.h3, fontWeight: WEIGHT.bold, color: colors.primary, marginBottom: 6 },
    title: { fontFamily: FONT_FAMILY, fontSize: TYPE.title, fontWeight: WEIGHT.bold, color: colors.primary },
    subtitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: colors.lightText, marginTop: 6, textAlign: 'center' },
    card: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 420 : undefined,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 0.09,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
      alignSelf: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 11,
      backgroundColor: colors.inputBg,
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
    },
    passwordRow: {
      position: 'relative',
    },
    passwordInput: {
      paddingRight: 64,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 13,
      padding: 4,
    },
    passwordToggleText: {
      fontFamily: FONT_FAMILY,
      color: colors.secondary,
      fontWeight: WEIGHT.semibold,
      fontSize: TYPE.caption,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 17,
      height: 17,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.card,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      fontFamily: FONT_FAMILY,
      color: colors.text,
      fontSize: TYPE.bodySmall,
    },
    error: { fontFamily: FONT_FAMILY, color: colors.error, marginBottom: 10, fontSize: TYPE.bodySmall },
    info: { fontFamily: FONT_FAMILY, color: colors.secondary, marginBottom: 10, fontSize: TYPE.bodySmall },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 6,
    },
    primaryButtonDisabled: { backgroundColor: '#9DBA9D' },
    primaryButtonText: { fontFamily: FONT_FAMILY, color: colors.white, fontWeight: WEIGHT.semibold, fontSize: TYPE.body },
    link: { fontFamily: FONT_FAMILY, color: colors.secondary, marginTop: 12, textAlign: 'center', fontSize: TYPE.bodySmall },
    linkInline: { fontFamily: FONT_FAMILY, color: colors.secondary, fontSize: TYPE.caption },
    brand: {
      fontFamily: FONT_FAMILY,
      marginTop: 12,
      textAlign: 'center',
      color: colors.secondary,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 1,
      fontSize: TYPE.caption,
    },
    bgOrbOne: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.iconBg,
      top: -60,
      right: -80,
      opacity: 0.9,
    },
    bgOrbTwo: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.pillBg,
      bottom: -60,
      left: -70,
      opacity: 0.8,
    },
  });

export default LoginScreen;
