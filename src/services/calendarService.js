import { collection, addDoc, query, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getCurrentUser = () => {
  return auth.currentUser;
};

export const listGears = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(collection(db, 'users', user.uid, 'gears'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const listCalendarWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(collection(db, 'users', user.uid, 'calendar'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const updateCalendarWorkout = async (workoutId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await updateDoc(docRef, updates);
};

export const setCalendarWorkout = async (workoutId, data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await setDoc(docRef, data);
};

export const createCalendarWorkout = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const collectionRef = collection(db, 'users', user.uid, 'calendar');
  await addDoc(collectionRef, data);
};

export const deleteCalendarWorkout = async (workoutId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'calendar', workoutId));
};

export const getUserProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists() ? profileSnap.data() : null;
};

export const generateCalendarCSVData = async (gears = []) => {
  const workouts = await listCalendarWorkouts();
  const headers = ['活動類型', '日期', '標題', '距離', '時間', '平均心率', '平均功率', '卡路里', '總組數', '裝備', '備註'];
  const rows = [headers];

  workouts.forEach((data) => {
    const type = data.type === 'run' ? '跑步' : '肌力訓練';
    let totalSets = 0;
    if (data.exercises && Array.isArray(data.exercises)) {
      totalSets = data.exercises.reduce((sum, ex) => sum + (parseInt(ex.sets) || 0), 0);
    }
    const gearName = gears.find((g) => g.id === data.gearId)?.model || '';
    const row = [
      type, data.date || '', data.title || '', data.runDistance || '', data.runDuration || '',
      data.runHeartRate || '', data.runPower || '', data.calories || '',
      totalSets > 0 ? totalSets : '', gearName, data.notes || ''
    ];
    const escapedRow = row.map((field) => {
      const str = String(field ?? '');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    });
    rows.push(escapedRow);
  });

  return "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
};
