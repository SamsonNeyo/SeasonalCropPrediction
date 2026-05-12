import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
// `getReactNativePersistence` is only exposed in the React Native bundle of
// firebase/auth. Metro resolves to that bundle at runtime, but TypeScript
// types come from the web bundle (where it's absent), so we pull it via
// the namespace import and cast.
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDR3ftA5HDF3Lf0PrwmU1I2Pk0_znAlr28',
  authDomain: 'cropprediction-luwero.firebaseapp.com',
  projectId: 'cropprediction-luwero',
  storageBucket: 'cropprediction-luwero.firebasestorage.app',
  messagingSenderId: '127015908000',
  appId: '1:127015908000:web:9510093950210b69d74fc5',
  measurementId: 'G-HDB1B3PJX2',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

type AsyncStorageType = typeof AsyncStorage;
type RNPersistenceFactory = (storage: AsyncStorageType) => unknown;

const rnPersistenceFactory = (FirebaseAuth as unknown as {
  getReactNativePersistence?: RNPersistenceFactory;
}).getReactNativePersistence;

let resolvedAuth: Auth;
try {
  if (typeof rnPersistenceFactory !== 'function') {
    // Should never happen on a React Native build — the RN bundle of
    // firebase/auth always exports this. If it does, sessions will only
    // live in memory and the user will be logged out on app restart.
    console.warn(
      '[firebase] getReactNativePersistence missing — auth state will not persist.',
    );
    resolvedAuth = getAuth(app);
  } else {
    resolvedAuth = initializeAuth(app, {
      persistence: rnPersistenceFactory(AsyncStorage) as never,
    });
  }
} catch (err: any) {
  // `initializeAuth` throws if called twice (Fast Refresh or hot reload).
  // In that case the existing instance already has AsyncStorage persistence
  // wired up — just reuse it.
  if (err?.code === 'auth/already-initialized') {
    resolvedAuth = getAuth(app);
  } else {
    throw err;
  }
}

export const auth = resolvedAuth;
export const db = getFirestore(app);
