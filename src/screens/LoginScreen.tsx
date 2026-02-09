import React, { useEffect, useRef, useState } from 'react';
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
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }: any) => {
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
      setInfo('Password reset email sent. Check your inbox.');
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
          placeholderTextColor={COLORS.lightText}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={COLORS.lightText}
            secureTextEntry={!showPassword}
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
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>No account? Create one</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: COLORS.lightText, marginTop: 6, textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
    color: COLORS.text,
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
    top: 12,
    padding: 4,
  },
  passwordToggleText: {
    color: COLORS.secondary,
    fontWeight: '600',
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
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    color: COLORS.text,
    fontSize: 13,
  },
  error: { color: COLORS.error, marginBottom: 10 },
  info: { color: COLORS.secondary, marginBottom: 10 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: { backgroundColor: '#9DBA9D' },
  primaryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  link: { color: COLORS.secondary, marginTop: 12, textAlign: 'center', fontSize: 13 },
  linkInline: { color: COLORS.secondary, fontSize: 12 },
  brand: {
    marginTop: 12,
    textAlign: 'center',
    color: COLORS.secondary,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 12,
  },
  bgOrbOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E6F1E6',
    top: -60,
    right: -80,
    opacity: 0.9,
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F7E8C8',
    bottom: -60,
    left: -70,
    opacity: 0.8,
  },
});

export default LoginScreen;
