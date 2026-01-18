import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getCurrentUser = () => {
  return auth.currentUser;
};

export const subscribeFoodLogsByDate = (dateStr, onNext, onError) => {
  const user = getCurrentUser();
  if (!user) {
    if (onNext) onNext([]);
    return () => {};
  }
  const q = query(
    collection(db, 'users', user.uid, 'food_logs'),
    where('date', '==', dateStr)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      if (onNext) onNext(data);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const createFoodLog = async (payload) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  return addDoc(collection(db, 'users', user.uid, 'food_logs'), {
    ...payload,
    createdAt: serverTimestamp()
  });
};

export const deleteFoodLog = async (logId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  return deleteDoc(doc(db, 'users', user.uid, 'food_logs', logId));
};
