/**
 * 個人化知識庫服務（RAG 初始版本）
 * 
 * 說明：
 * - 目前先使用 Firestore 儲存「訓練日記 / 傷痛紀錄 / 復健建議」等文字資料
 * - 檢索邏輯先採用簡單的關鍵字搜尋與時間排序
 * - 未來可在此處接入 Firebase Vector Search / Pinecone 等向量搜尋服務
 */

import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const getCurrentUser = () => auth.currentUser;

/**
 * 新增一筆個人知識庫紀錄
 * @param {Object} params
 * @param {'note'|'injury'|'rehab'} params.type - 紀錄類型
 * @param {string} params.text - 文字內容
 * @param {Object} [params.metadata] - 其他相關資訊（如日期、來源等）
 */
export const addKnowledgeRecord = async ({ type = 'note', text, metadata = {} }) => {
  const user = getCurrentUser();
  if (!user || !text) return;

  try {
    const ref = collection(db, 'users', user.uid, 'knowledge_base');
    await addDoc(ref, {
      type,
      text,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('新增知識庫紀錄失敗:', error);
  }
};

/**
 * 依據使用者提問，從知識庫中檢索相關紀錄
 * 目前採用簡單關鍵字與時間排序，未啟用向量搜尋
 * @param {string} queryText - 使用者提問
 * @param {number} topK - 取回前幾筆
 * @returns {Promise<Array<{text:string, metadata:Object}>>}
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
 * 產生可附加到 Prompt 的個人知識庫摘要片段
 * @param {string} queryText - 使用者提問
 * @returns {Promise<string>} 摘要文字，可直接拼接進 AI Prompt
 */
export const getKnowledgeContextForQuery = async (queryText) => {
  const records = await searchKnowledgeRecords(queryText, 5);
  if (!records || records.length === 0) return '';

  const lines = records.map((rec, idx) => {
    const date = rec.metadata?.date || (rec.createdAt ? rec.createdAt.slice(0, 10) : '未知日期');
    const typeLabel = rec.metadata?.typeLabel || rec.metadata?.type || '紀錄';
    return `(${idx + 1}) [${date}][${typeLabel}] ${rec.text}`;
  });

  return `\n[歷史相關紀錄]\n${lines.join('\n')}\n`;
};

