import { db } from '../config/firebase';
import { collection, addDoc, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth } from '../config/firebase';

export const savePrediction = async (data: any) => {
  if (!auth.currentUser) {
    throw new Error('Not authenticated');
  }
  try {
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'prediction_history'), {
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('savePrediction failed:', e?.code, e?.message);
    throw e;
  }
};

export const getUserHistory = async () => {
  if (!auth.currentUser) return [];
  try {
    const q = query(collection(db, 'users', auth.currentUser.uid, 'prediction_history'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e: any) {
    console.error('getUserHistory failed:', e?.code, e?.message);
    throw e;
  }
};

export const deleteHistoryItem = async (id: string) => {
  if (!auth.currentUser) return;
  await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'prediction_history', id));
};
