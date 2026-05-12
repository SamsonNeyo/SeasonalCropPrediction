import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

const EmailVerificationScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, refreshUser, sendVerificationEmail, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleCheckVerified = async () => {
    try {
      setError('');
      setChecking(true);
      const updated = await refreshUser();
      if (!updated?.emailVerified) {
        setError("Email not verified yet. Check your inbox and click the link, then try again.");
      }
      // If verified, AppNavigator's key changes and this screen unmounts automatically
    } catch {
      setError('Could not check verification status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    try {
      setError('');
      setResending(true);
      setResent(false);
      await sendVerificationEmail();
      setResent(true);
    } catch {
      setError('Could not resend the email. Try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.orbTop, { pointerEvents: 'none' }]} />
      <View style={[styles.orbBottom, { pointerEvents: 'none' }]} />

      <View style={styles.container}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconRing}>
            <MaterialCommunityIcons name="email-check-outline" size={36} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.body}>
            Open your inbox and tap the link to activate your account before signing in.
          </Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Resent confirmation */}
          {resent && !error && (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={15} color={colors.primary} />
              <Text style={styles.successText}>Verification email sent again.</Text>
            </View>
          )}

          {/* Primary action */}
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
            onPress={handleCheckVerified}
            disabled={checking}
            accessibilityRole="button"
            accessibilityLabel="I have verified my email"
          >
            {checking
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Text style={styles.btnPrimaryText}>I've verified my email</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </>
              )
            }
          </Pressable>

          {/* Resend */}
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
            onPress={handleResend}
            disabled={resending}
            accessibilityRole="button"
            accessibilityLabel="Resend verification email"
          >
            {resending
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.btnSecondaryText}>Resend verification email</Text>
            }
          </Pressable>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [styles.btnSignOut, pressed && { opacity: 0.7 }]}
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <MaterialCommunityIcons name="logout" size={16} color={colors.lightText} />
            <Text style={styles.btnSignOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    orbTop: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: c.iconBg,
      top: -80,
      right: -70,
      opacity: 0.85,
    },
    orbBottom: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: c.pillBg,
      bottom: -60,
      left: -60,
      opacity: 0.8,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
    },
    card: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 440 : undefined,
      alignSelf: 'center',
      backgroundColor: c.glass,
      borderRadius: RADIUS.xxl,
      borderWidth: 1,
      borderColor: c.glassBorder,
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.xxl + 4,
      alignItems: 'center',
      ...elevation(c.shadow, 'xl'),
    },
    iconRing: {
      width: 80,
      height: 80,
      borderRadius: RADIUS.lg + 4,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
      ...elevation(c.shadow, 'sm'),
    },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: 24,
      fontWeight: WEIGHT.bold,
      color: c.text,
      textAlign: 'center',
      marginBottom: SPACING.sm,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
    },
    email: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: SPACING.md,
    },
    body: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 300,
      marginBottom: SPACING.xl,
    },
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
      alignSelf: 'stretch',
    },
    errorText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.error,
      fontWeight: WEIGHT.semibold,
    },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: 10,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: `${c.primary}12`,
      borderWidth: 1,
      borderColor: `${c.primary}30`,
      marginBottom: SPACING.md,
      alignSelf: 'stretch',
    },
    successText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.primary,
      fontWeight: WEIGHT.semibold,
    },
    btnPrimary: {
      height: 54,
      backgroundColor: c.primary,
      borderRadius: RADIUS.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      alignSelf: 'stretch',
      marginBottom: SPACING.md,
    },
    btnPrimaryText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: '#fff',
      letterSpacing: 0.2,
    },
    btnSecondary: {
      height: 54,
      borderRadius: RADIUS.pill,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    btnSecondaryText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },
    divider: {
      height: 1,
      backgroundColor: c.glassBorder,
      alignSelf: 'stretch',
      marginVertical: SPACING.lg,
    },
    btnSignOut: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
    },
    btnSignOutText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
    },
  });

export default EmailVerificationScreen;
