import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../config/firebase';

type AuthContextType = {
  user: User | null;
  userData: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
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
        return 'Email/password sign-in is not enabled in Firebase Auth.';
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

  useEffect(() => {
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
      await setDoc(doc(db, 'users', cred.user.uid), { name, soilType: 'Loam' });
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
        login,
        signup,
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
