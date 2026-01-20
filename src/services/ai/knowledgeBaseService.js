/**
 * 個人化知識庫服務（RAG 初始版本）
 *
 * 說明：
 * - 目前先使用 Firestore 儲存「訓練日記 / 傷痛紀錄 / 復健建議」等文字資料
 * - 檢索邏輯先採用簡單的關鍵字搜尋與時間排序
 * - 本檔已為「向量搜尋 / Embedding」預留欄位與 API 介面，但尚未接實際向量服務
 */

import { collection, addDoc, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth, app } from '../../firebase';

const getCurrentUser = () => auth.currentUser;
const functions = getFunctions(app);
// 對應 Cloud Functions 專案中的 exports.searchKnowledge
const searchKnowledgeCallable = httpsCallable(functions, 'searchKnowledge');

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
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    const docRef = await addDoc(ref, {
      type,
      text,
      metadata,
      createdAt: new Date().toISOString(),
    });
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
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    // 沒有有效向量時，直接走關鍵字版本
    return searchKnowledgeRecords(queryText, topK);
  }

  console.info('[KnowledgeBase] 向量搜尋尚未實作，改用關鍵字搜尋 fallback');
  return searchKnowledgeRecords(queryText, topK);
};

/**
 * 產生可附加到 Prompt 的個人知識庫摘要片段
 * @param {string} queryText - 使用者提問
 * @returns {Promise<string>} 摘要文字，可直接拼接進 AI Prompt
 */
export const getKnowledgeContextForQuery = async (queryText) => {
  if (!queryText) return '';

  // 1) 優先嘗試呼叫 Cloud Function 進行向量搜尋
  let records = [];
  try {
    const res = await searchKnowledgeCallable({ queryText, topK: 5 });
    if (Array.isArray(res.data?.records)) {
      records = res.data.records;
    }
  } catch (error) {
    console.warn('向量搜尋 Cloud Function 呼叫失敗，改用關鍵字搜尋', error);
  }

  // 2) 若沒有結果，退回關鍵字搜尋
  if (!records || records.length === 0) {
    records = await searchKnowledgeRecords(queryText, 5);
  }

  if (!records || records.length === 0) return '';

  const lines = records.map((rec, idx) => {
    const date = rec.metadata?.date || (rec.createdAt ? rec.createdAt.slice(0, 10) : '未知日期');
    const typeLabel = rec.metadata?.typeLabel || rec.metadata?.type || '紀錄';
    return `(${idx + 1}) [${date}][${typeLabel}] ${rec.text}`;
  });

  return `\n[歷史相關紀錄]\n${lines.join('\n')}\n`;
};

