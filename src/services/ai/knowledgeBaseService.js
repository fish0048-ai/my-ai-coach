/**
 * 個人化知識庫服務（RAG：純前端向量版本）
 *
 * 說明：
 * - 使用 Firestore 儲存「訓練日記 / 傷痛紀錄 / 復健建議」等文字資料
 * - 在前端呼叫 Gemini Embedding API 產生向量，直接寫入 Firestore
 * - 向量搜尋也在前端以 cosine similarity 計算（適合中小量個人資料）
 * - 若無法取得向量，會自動退回簡單關鍵字搜尋
 */

import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { getApiKey } from '../config/apiKeyService';

const getCurrentUser = () => auth.currentUser;

/**
 * 產生文字的 embedding（在前端呼叫 Gemini Embedding API）
 * @param {string} text
 * @returns {Promise<number[]>}
 */
const generateEmbeddingForText = async (text) => {
  const apiKey = getApiKey();
  if (!apiKey || !text) {
    console.warn('[KnowledgeBase] 無法產生 embedding：缺少 API Key 或文字內容');
    return [];
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[KnowledgeBase] 產生 embedding 失敗:', res.status, errText);
      return [];
    }

    const data = await res.json();
    const embedding = data.embedding?.values || [];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn('[KnowledgeBase] embedding 回傳為空');
      return [];
    }

    return embedding;
  } catch (error) {
    console.error('[KnowledgeBase] 呼叫 Gemini Embedding API 失敗:', error);
    return [];
  }
};

/**
 * 新增一筆個人知識庫紀錄
 * Firestore 結構示意：
 * users/{uid}/knowledge_base/{docId} = {
 *   type: 'note' | 'injury' | 'rehab',
 *   text: string,
 *   metadata: Object,
 *   createdAt: string,
 *   // 以下為預留欄位，之後串接向量服務時使用：
 *   embedding?: number[],          // 文本向量
 *   embeddingModel?: string        // 例如 'text-embedding-004'
 * }
 *
 * @param {Object} params
 * @param {'note'|'injury'|'rehab'} params.type - 紀錄類型
 * @param {string} params.text - 文字內容
 * @param {Object} [params.metadata] - 其他相關資訊（如日期、來源等）
 * @returns {Promise<string|undefined>} 新增文件的 ID（若失敗則回傳 undefined）
 */
export const addKnowledgeRecord = async ({ type = 'note', text, metadata = {} }) => {
  const user = getCurrentUser();
  if (!user || !text) return;

  try {
    // 嘗試在前端產生 embedding（失敗時仍會寫入文字紀錄，只是沒有向量）
    const embedding = await generateEmbeddingForText(text);

    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    const payload = {
      type,
      text,
      metadata,
      createdAt: new Date().toISOString(),
    };

    if (Array.isArray(embedding) && embedding.length > 0) {
      payload.embedding = embedding;
      payload.embeddingModel = 'text-embedding-004';
      payload.embeddingUpdatedAt = new Date().toISOString();
    }

    const docRef = await addDoc(ref, payload);
    return docRef.id;
  } catch (error) {
    console.error('新增知識庫紀錄失敗:', error);
    return undefined;
  }
};

/**
 * 依據使用者提問，從知識庫中檢索相關紀錄（關鍵字版本）
 * - 目前作為預設 fallback
 * - 將來可由向量搜尋結果補強或取代
 *
 * @param {string} queryText - 使用者提問
 * @param {number} topK - 取回前幾筆
 * @returns {Promise<Array<{text:string, metadata:Object, createdAt:string}>>}
 */
export const searchKnowledgeRecords = async (queryText, topK = 5) => {
  const user = getCurrentUser();
  if (!user || !queryText) return [];

  try {
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    // 先抓最近 N 筆，再在前端做關鍵字過濾
    const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);

    const lowerQuery = queryText.toLowerCase();
    const candidates = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data || !data.text) return;
      const text = String(data.text);
      const score = text.toLowerCase().includes(lowerQuery) ? 1 : 0;
      if (score > 0) {
        candidates.push({
          id: docSnap.id,
          text,
          metadata: data.metadata || {},
          createdAt: data.createdAt,
        });
      }
    });

    return candidates.slice(0, topK);
  } catch (error) {
    console.error('搜尋知識庫失敗:', error);
    return [];
  }
};

/**
 * 更新既有紀錄的 Embedding（預留給向量服務使用）
 * - 實際產生向量的邏輯應在呼叫端（例如 Cloud Function 或前端 worker）
 * - 此函式只負責將向量與模型名稱寫回 Firestore
 *
 * @param {string} recordId - 知識庫文件 ID
 * @param {number[]} embedding - 文本向量
 * @param {string} [model] - 模型名稱，例如 'text-embedding-004'
 */
export const updateKnowledgeEmbedding = async (recordId, embedding, model = 'text-embedding-004') => {
  const user = getCurrentUser();
  if (!user || !recordId || !Array.isArray(embedding)) return;

  try {
    const ref = doc(db, 'users', user.uid, 'knowledge_base', recordId);
    await updateDoc(ref, {
      embedding,
      embeddingModel: model,
      embeddingUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('更新知識庫 Embedding 失敗:', error);
  }
};

/** rag-p3-2：觸發向量搜尋的關鍵字（感覺、痛、心情、傷痛等語意查詢） */
const VECTOR_SEARCH_TRIGGER_KEYWORDS = [
  '感覺', '痛', '心情', '傷', '不適', '疲勞', '恢復', '膝蓋', '腳踝', '腰', '背',
  '上次', '經驗', '紀錄', '日記', '心得', '復健', '受傷', '痠', '酸',
];

/** 檢查查詢是否應觸發向量搜尋 */
function shouldUseVectorSearch(queryText) {
  if (!queryText || typeof queryText !== 'string') return false;
  const lower = queryText.toLowerCase();
  return VECTOR_SEARCH_TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * rag-p3-1：為缺少 embedding 的舊紀錄回填向量
 * @param {Object} options
 * @param {number} [options.batchSize] - 每批處理筆數
 * @param {Function} [options.onProgress] - (processed, total, currentId) => void
 * @returns {Promise<{ updated: number, skipped: number, failed: number }>}
 */
export const backfillEmbeddingsForExistingRecords = async ({
  batchSize = 10,
  onProgress,
} = {}) => {
  const user = getCurrentUser();
  if (!user) return { updated: 0, skipped: 0, failed: 0 };

  try {
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
    const snap = await getDocs(q);

    const needEmbedding = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.text && !Array.isArray(data?.embedding)) {
        needEmbedding.push({ id: docSnap.id, text: data.text });
      }
    });

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < needEmbedding.length; i += batchSize) {
      const batch = needEmbedding.slice(i, i + batchSize);
      for (const rec of batch) {
        try {
          const embedding = await generateEmbeddingForText(rec.text);
          if (Array.isArray(embedding) && embedding.length > 0) {
            await updateKnowledgeEmbedding(rec.id, embedding);
            updated += 1;
          }
          onProgress?.(i + batch.indexOf(rec) + 1, needEmbedding.length, rec.id);
        } catch (e) {
          console.warn('[KnowledgeBase] 回填 embedding 失敗:', rec.id, e);
          failed += 1;
        }
      }
    }

    return {
      updated,
      skipped: needEmbedding.length - updated - failed,
      failed,
    };
  } catch (error) {
    console.error('[KnowledgeBase] 回填 embeddings 失敗:', error);
    return { updated: 0, skipped: 0, failed: 0 };
  }
};

/**
 * 讀取使用者的知識庫紀錄清單
 * @param {Object} options
 * @param {number} [options.limitCount] - 讀取筆數上限（預設 100）
 * @param {'all'|'note'|'injury'|'rehab'} [options.type] - 篩選類型
 * @returns {Promise<Array<{id:string, type:string, text:string, metadata:Object, createdAt:string}>>}
 */
export const listKnowledgeRecords = async ({ limitCount = 100, type = 'all' } = {}) => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    let q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));

    // 若要依 type 篩選，可在前端過濾；
    // 為避免複雜複合索引，這裡先不使用 where('type', '==', ...)
    const snap = await getDocs(q);
    const all = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data || !data.text) return;
      all.push({
        id: docSnap.id,
        type: data.type || 'note',
        text: String(data.text),
        metadata: data.metadata || {},
        createdAt: data.createdAt,
      });
    });

    if (type === 'all') return all;
    return all.filter((r) => r.type === type);
  } catch (error) {
    console.error('[KnowledgeBase] 讀取知識庫清單失敗:', error);
    return [];
  }
};

/**
 * 刪除一筆知識庫紀錄
 * @param {string} recordId
 */
export const deleteKnowledgeRecord = async (recordId) => {
  const user = getCurrentUser();
  if (!user || !recordId) return;

  try {
    const ref = doc(db, 'users', user.uid, 'knowledge_base', recordId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('[KnowledgeBase] 刪除紀錄失敗:', error);
    throw error;
  }
};

/**
 * 使用向量進行相似度搜尋（介面預留）
 *
 * ⚠️ 目前尚未接實際向量搜尋服務，故會：
 * - log 一則提示訊息
 * - 回退使用關鍵字搜尋（若有 queryText）
 *
 * @param {number[]} queryEmbedding - 查詢向量
 * @param {Object} options
 * @param {string} [options.queryText] - 原始文字查詢，用於 fallback
 * @param {number} [options.topK] - 取回前幾筆
 * @returns {Promise<Array<{text:string, metadata:Object, createdAt:string}>>}
 */
export const searchKnowledgeByEmbedding = async (queryEmbedding, { queryText = '', topK = 5 } = {}) => {
  const user = getCurrentUser();
  if (!user) return [];

  // 若未提供向量，先以查詢文字產生一個
  let embedding = Array.isArray(queryEmbedding) && queryEmbedding.length > 0
    ? queryEmbedding
    : await generateEmbeddingForText(queryText);

  if (!Array.isArray(embedding) || embedding.length === 0) {
    // 無法產生向量時退回關鍵字搜尋
    return searchKnowledgeRecords(queryText, topK);
  }

  try {
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    // 為控制成本與效能，僅抓最近 200 筆來計算相似度
    const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
    const snap = await getDocs(q);

    const docs = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data || !Array.isArray(data.embedding)) return;

      docs.push({
        id: docSnap.id,
        text: String(data.text || ''),
        metadata: data.metadata || {},
        createdAt: data.createdAt,
        embedding: data.embedding,
      });
    });

    if (docs.length === 0) {
      return searchKnowledgeRecords(queryText, topK);
    }

    // 計算 cosine similarity
    const dot = (a, b) => a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
    const norm = (a) => Math.sqrt(dot(a, a));
    const queryNorm = norm(embedding) || 1;

    const scored = docs.map((d) => {
      const e = d.embedding;
      const score = dot(embedding, e) / (queryNorm * (norm(e) || 1));
      return { ...d, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((d) => ({
      id: d.id,
      text: d.text,
      metadata: d.metadata,
      createdAt: d.createdAt,
    }));
  } catch (error) {
    console.error('[KnowledgeBase] 向量搜尋失敗，改用關鍵字搜尋:', error);
    return searchKnowledgeRecords(queryText, topK);
  }
};

/**
 * 產生可附加到 Prompt 的個人知識庫摘要片段
 * @param {string} queryText - 使用者提問
 * @returns {Promise<string>} 摘要文字，可直接拼接進 AI Prompt
 */
export const getKnowledgeContextForQuery = async (queryText) => {
  if (!queryText) return '';

  try {
    // rag-p3-2：關鍵字觸發向量搜尋（感覺、痛、心情等語意查詢才用向量）
    let records;
    if (shouldUseVectorSearch(queryText)) {
      records = await searchKnowledgeByEmbedding(null, { queryText, topK: 5 });
      if (!records || records.length === 0) {
        records = await searchKnowledgeRecords(queryText, 5);
      }
    } else {
      records = await searchKnowledgeRecords(queryText, 5);
    }

    if (!records || records.length === 0) return '';

    const lines = records.map((rec, idx) => {
      const date = rec.metadata?.date || (rec.createdAt ? rec.createdAt.slice(0, 10) : '未知日期');
      const typeLabel = rec.metadata?.typeLabel || rec.metadata?.type || '紀錄';
      return `(${idx + 1}) [${date}][${typeLabel}] ${rec.text}`;
    });

    return `\n[歷史相關紀錄]\n${lines.join('\n')}\n`;
  } catch (error) {
    console.error('獲取知識庫上下文失敗 (可能是權限不足):', error);
    return ''; // 發生權限錯誤或其他問題時，直接忽略知識庫內容，讓 AI 繼續運作
  }
};

