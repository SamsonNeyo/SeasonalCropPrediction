import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  query,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { auth } from '../config/firebase';

export const savePrediction = async (data: any) => {
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
  try {
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'prediction_history'), {
      ...data,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (e: any) {
    console.error('savePrediction failed:', e?.code, e?.message);
    throw e;
  }
};

type HistoryOptions = {
  limitCount?: number;
  startAfterDoc?: QueryDocumentSnapshot;
};

export const getUserHistory = async (options: HistoryOptions = {}) => {
  if (!auth.currentUser) return { items: [], lastDoc: null };
  try {
    const limitCount = options.limitCount ?? 50;
    const base = query(
      collection(db, 'users', auth.currentUser.uid, 'prediction_history'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const q = options.startAfterDoc ? query(base, startAfter(options.startAfterDoc)) : base;
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    return { items, lastDoc };
  } catch (e: any) {
    console.error('getUserHistory failed:', e?.code, e?.message);
    throw e;
  }
};

export const deleteHistoryItem = async (id: string) => {
  if (!auth.currentUser) return;
  await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'prediction_history', id));
};
