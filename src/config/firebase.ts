import { Platform } from 'react-native';

type FirebaseModule = typeof import('./firebase.native');

const firebaseModule = (Platform.OS === 'web'
  ? require('./firebase.web')
  : require('./firebase.native')) as FirebaseModule;

export const { auth, db } = firebaseModule;
