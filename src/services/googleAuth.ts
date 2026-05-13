import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go does not ship the @react-native-google-signin/google-signin
// native module, so any call into it throws at runtime. We detect Expo Go
// up-front and short-circuit the hook with a clear error.
// SDK 48+: executionEnvironment === 'storeClient'; older SDKs: appOwnership === 'expo'.
const isExpoGo =
  (Constants as any).executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

const loadGoogleSigninModule = (): GoogleSigninModule | null => {
  if (Platform.OS === 'web' || isExpoGo) return null;
  try {
    // Deferred require so Metro does not eagerly load native code when
    // running inside Expo Go (where the module would be missing).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    return null;
  }
};

const googleSigninModule = loadGoogleSigninModule();

const GOOGLE_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

type Pending = {
  resolve: (idToken: string | null) => void;
  reject: (err: Error) => void;
};

export type GoogleAuthHook = {
  ready: boolean;
  supported: boolean;
  signIn: () => Promise<string | null>;
};

const getGoogleSignInError = (error: unknown, statusCodes: GoogleSigninModule['statusCodes'] | null) => {
  if (statusCodes && typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code?: unknown }).code);
    switch (code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return 'Google sign-in was cancelled.';
      case statusCodes.IN_PROGRESS:
        return 'A Google sign-in is already in progress.';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services is not available or needs to be updated.';
      default:
        break;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Google sign-in failed.';
};

export const useGoogleAuth = (): GoogleAuthHook => {
  const pendingRef = useRef<Pending | null>(null);
  const isWeb = Platform.OS === 'web';
  // Web uses Firebase popup directly; native uses GoogleSignin module.
  const supported = isWeb || !!googleSigninModule;
  const [configured, setConfigured] = useState(isWeb);

  const hasRequiredClientId = useMemo(() => {
    if (isWeb) return true;
    if (!GOOGLE_CONFIG.webClientId) return false;
    if (Platform.OS === 'ios' && !GOOGLE_CONFIG.iosClientId) return false;
    return true;
  }, [isWeb]);

  useEffect(() => {
    if (isWeb) return;
    if (!googleSigninModule) return;
    if (!hasRequiredClientId) return;

    googleSigninModule.GoogleSignin.configure({
      webClientId: GOOGLE_CONFIG.webClientId,
      iosClientId: GOOGLE_CONFIG.iosClientId || undefined,
      scopes: ['profile', 'email'],
    });
    setConfigured(true);
  }, [hasRequiredClientId, isWeb]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (isWeb) {
      throw new Error('Native Google sign-in is not used on web.');
    }
    if (isExpoGo) {
      throw new Error(
        'Google sign-in is not available in Expo Go. Use the development build to test Google sign-in.',
      );
    }
    if (!googleSigninModule) {
      throw new Error(
        'Google sign-in native module is not installed in this build.',
      );
    }
    if (!GOOGLE_CONFIG.webClientId) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Google sign-in.');
    }
    if (Platform.OS === 'ios' && !GOOGLE_CONFIG.iosClientId) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for Google sign-in on iOS.');
    }
    if (!configured) {
      throw new Error('Google sign-in is still preparing. Please try again in a moment.');
    }
    if (pendingRef.current) {
      throw new Error('A Google sign-in is already in progress.');
    }

    const { GoogleSignin, statusCodes } = googleSigninModule;

    return new Promise<string | null>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      const finish = () => {
        pendingRef.current = null;
      };

      (async () => {
        try {
          if (Platform.OS === 'android') {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          }

          const response = await GoogleSignin.signIn();
          if (response.type === 'cancelled') {
            resolve(null);
            return;
          }

          const idToken = response.data.idToken || (await GoogleSignin.getTokens()).idToken;
          resolve(idToken || null);
        } catch (e) {
          const message = getGoogleSignInError(e, statusCodes);
          if (/cancel/i.test(message)) {
            resolve(null);
          } else {
            reject(new Error(message));
          }
        } finally {
          finish();
        }
      })();
    });
  }, [configured, isWeb]);

  return {
    signIn,
    supported,
    ready: configured && hasRequiredClientId && supported,
  };
};
