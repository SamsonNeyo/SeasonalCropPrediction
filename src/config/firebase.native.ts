import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDR3ftA5HDF3Lf0PrwmU1I2Pk0_znAlr28",
  authDomain: "cropprediction-luwero.firebaseapp.com",
  projectId: "cropprediction-luwero",
  storageBucket: "cropprediction-luwero.firebasestorage.app",
  messagingSenderId: "127015908000",
  appId: "1:127015908000:web:9510093950210b69d74fc5",
  measurementId: "G-HDB1B3PJX2"
};

const app = initializeApp(firebaseConfig);

const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: typeof ReactNativeAsyncStorage) => any)
  | undefined;

export const auth = (() => {
  if (typeof getReactNativePersistence === 'function') {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch {
      return getAuth(app);
    }
  }
  return getAuth(app);
})();
export const db = getFirestore(app);
