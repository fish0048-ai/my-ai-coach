import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { calculateConcentricPower } from '../utils/workoutCalculations';

const getCurrentUser = () => {
  return auth.currentUser;
};

/** 從 metrics 讀取向心垂直位移（公尺）；若 unit 為 cm 則換算 */
const readConcentricDisplacementMeters = (metrics) => {
  if (!metrics || !metrics.concentricDisplacement) return NaN;
  const { value, unit = 'm' } = metrics.concentricDisplacement;
  const v = parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(v)) return NaN;
  const u = String(unit).toLowerCase();
  if (u === 'cm') return v / 100;
  return v;
};

/** 從 metrics 讀取向心時間（秒） */
const readConcentricTimeSeconds = (metrics) => {
  if (!metrics || !metrics.concentricTime) return NaN;
  const v = parseFloat(String(metrics.concentricTime.value ?? '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

/**
 * 依「負重 + 向心位移／時間」計算平均功率並合併至即將寫入 Calendar 的重訓分析文件
 * （依 @/utils/workoutCalculations 之 calculateConcentricPower）
 *
 * @param {Object} entry - 含 `metrics` 的分析條目
 * @param {number} [massKg] - 外在負重 (kg)，可來自 `entry.liftMassKg`
 * @returns {Object} 新條目（含 averagePowerW、averagePowerDisplay 等；無法計算時不改動功率欄位）
 */
export const mergeStrengthAnalysisAveragePower = (entry, massKg) => {
  if (!entry || typeof entry !== 'object') return entry;
  const m = massKg !== undefined && massKg !== null ? parseFloat(massKg) : parseFloat(entry.liftMassKg);
  if (!Number.isFinite(m) || m <= 0) return entry;

  const metrics = entry.metrics;
  const d = readConcentricDisplacementMeters(metrics);
  const t = readConcentricTimeSeconds(metrics);
  const power = calculateConcentricPower(m, d, t);
  if (!power) return entry;

  return {
    ...entry,
    averagePowerW: power.watts,
    averagePowerDisplay: power.display,
    averagePowerUnit: power.unit,
    averagePowerMeta: {
      formula: '(mass × g × displacement) / time',
      g: 9.8,
      massKg: m,
      displacementM: Number(d.toFixed(4)),
      timeS: Number(t.toFixed(4)),
    },
  };
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
  const mass = data?.liftMassKg;
  const payload = mergeStrengthAnalysisAveragePower({ ...data }, mass);
  if (docId) {
    await updateDoc(doc(db, 'users', user.uid, 'calendar', docId), payload);
  } else {
    await addDoc(collection(db, 'users', user.uid, 'calendar'), payload);
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
