import { collection, addDoc, query, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

export const listCalendarWorkoutsByDateRange = async (startDate, endDate = null) => {
  const user = getCurrentUser();
  if (!user) return [];
  const constraints = [collection(db, 'users', user.uid, 'calendar'), where('date', '>=', startDate)];
  if (endDate) {
    constraints.push(where('date', '<=', endDate));
  }
  const q = query(...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const listTodayWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const todayStr = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('date', '==', todayStr));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const listCompletedWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const subscribeCompletedWorkouts = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  });
};

export const listRunLogs = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(
    collection(db, 'users', user.uid, 'calendar'),
    where('type', '==', 'run'),
    where('status', '==', 'completed')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      date: data.date,
      distance: parseFloat(data.runDistance || 0)
    };
  });
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

// Gear 相關操作
export const subscribeGears = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'gears'), orderBy('startDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const gearData = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(gearData);
  });
};

export const createGear = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await addDoc(collection(db, 'users', user.uid, 'gears'), {
    ...data,
    currentDistance: 0,
    createdAt: serverTimestamp()
  });
};

export const updateGear = async (gearId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await updateDoc(doc(db, 'users', user.uid, 'gears', gearId), updates);
};

export const deleteGear = async (gearId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'gears', gearId));
};
