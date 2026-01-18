import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getCurrentUser = () => {
  return auth.currentUser;
};

export const findStrengthAnalysis = async (dateStr, title) => {
  const user = getCurrentUser();
  if (!user) return null;
  const q = query(
    collection(db, 'users', user.uid, 'calendar'),
    where('date', '==', dateStr),
    where('title', '==', title),
    where('type', '==', 'analysis')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
};

export const upsertStrengthAnalysis = async (docId, data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  if (docId) {
    await updateDoc(doc(db, 'users', user.uid, 'calendar', docId), data);
  } else {
    await addDoc(collection(db, 'users', user.uid, 'calendar'), data);
  }
};

export const saveRunAnalysis = async (dateStr, analysisEntry) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
  const docSnap = await getDoc(docRef);
  const newData = docSnap.exists()
    ? { ...docSnap.data(), exercises: [...(docSnap.data().exercises || []), analysisEntry] }
    : { date: dateStr, status: 'completed', type: 'strength', title: 'AI 分析日', exercises: [analysisEntry] };
  await setDoc(docRef, newData);
};
