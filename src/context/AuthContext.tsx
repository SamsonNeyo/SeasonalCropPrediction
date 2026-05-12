import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../config/firebase';
import { useGoogleAuth } from '../services/googleAuth';

type AuthContextType = {
  user: User | null;
  userData: any;
  loading: boolean;
  googleAuthSupported: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserData: (data: Record<string, any>) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  sendVerificationEmail: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);


const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/user-not-found':
        return 'No account found with that email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/email-already-in-use':
        return 'That email is already in use.';
      case 'auth/weak-password':
        return 'Password is too weak (min 6 characters).';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Auth.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Google sign-in was cancelled.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method.';
      case 'auth/invalid-continue-uri':
      case 'auth/missing-continue-uri':
      case 'auth/unauthorized-continue-uri':
        return 'Password reset link configuration is invalid. Check Firebase Auth authorized domains.';
      default:
        return error.message || 'Authentication failed.';
    }
  }
  if (error instanceof Error) return error.message;
  return 'Authentication failed.';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const googleAuth = useGoogleAuth();

  useEffect(() => {
    if (Platform.OS === 'web') {
      getRedirectResult(auth).then(async (result) => {
        if (result?.user) {
          const docRef = doc(db, 'users', result.user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const fallbackName =
              result.user.displayName?.trim() ||
              result.user.email?.split('@')[0] ||
              'Farmer';
            await setDoc(docRef, {
              name: fallbackName,
              email: result.user.email || '',
              photoUri: result.user.photoURL || null,
              region: 'Luwero',
              subCounty: '',
              soilType: '',
              profileComplete: false,
            });
          }
        }
      }).catch((err) => { console.warn('[Auth] getRedirectResult error:', err); });
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        setUserData(docSnap.exists() ? docSnap.data() : { name: currentUser.email?.split('@')[0] || 'Farmer' });
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (e) {
      throw new Error(getAuthErrorMessage(e));
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await sendEmailVerification(cred.user);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        region: 'Luwero',
        subCounty: '',
        soilType: '',
        profileComplete: false,
      });
    } catch (e) {
      throw new Error(getAuthErrorMessage(e));
    }
  };

  const ensureUserDoc = async (currentUser: User) => {
    const docRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return;
    const fallbackName =
      currentUser.displayName?.trim() ||
      currentUser.email?.split('@')[0] ||
      'Farmer';
    await setDoc(docRef, {
      name: fallbackName,
      email: currentUser.email || '',
      photoUri: currentUser.photoURL || null,
      region: 'Luwero',
      subCounty: '',
      soilType: '',
      profileComplete: false,
    });
  };

  const loginWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        // Try popup first — works in a direct browser tab with no page reload.
        try {
          const result = await signInWithPopup(auth, provider);
          await ensureUserDoc(result.user);
          return;
        } catch (popupError: any) {
          if (popupError?.code !== 'auth/popup-blocked') {
            throw popupError;
          }
          // Popup was blocked. Check if we are inside an iframe (Expo simulator preview).
          // signInWithRedirect cannot work in an iframe because browsers partition
          // sessionStorage between the iframe and the top-level page, causing Firebase
          // to lose its pending-redirect state on return.
          let inIframe = false;
          try { inIframe = window.self !== window.top; } catch { inIframe = true; }
          if (inIframe) {
            throw new FirebaseError(
              'auth/popup-blocked',
              'Google sign-in requires opening the app in a real browser tab. ' +
              'Please open http://localhost:8081 in a new tab, then try again.',
            );
          }
          // Not in an iframe — redirect is safe.
          try { localStorage.setItem('sc-google-auth-pending', '1'); } catch {}
          await signInWithRedirect(auth, provider);
          return;
        }
      }
      const idToken = await googleAuth.signIn();
      if (!idToken) throw new Error('Google sign-in was cancelled.');
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await ensureUserDoc(result.user);
    } catch (e) {
      throw new Error(getAuthErrorMessage(e));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      throw new Error(getAuthErrorMessage(e));
    }
  };
  const resetPassword = async (email: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT?.trim();

      if (redirectUrl) {
        await sendPasswordResetEmail(auth, normalizedEmail, { url: redirectUrl });
      } else {
        await sendPasswordResetEmail(auth, normalizedEmail);
      }
    } catch (e) {
      throw new Error(getAuthErrorMessage(e));
    }
  };
  const updateUserData = async (data: Record<string, any>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, data, { merge: true });
    setUserData((prev: any) => ({ ...(prev || {}), ...data }));
  };
  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    setUser(auth.currentUser);
    return auth.currentUser;
  };
  const sendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        googleAuthSupported: googleAuth.supported,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
        updateUserData,
        refreshUser,
        sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
