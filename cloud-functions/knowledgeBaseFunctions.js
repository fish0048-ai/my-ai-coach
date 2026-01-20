/* eslint-disable */
/**
 * Firebase Cloud Functions：個人化知識庫（RAG）相關
 *
 * 說明：
 * - 這個檔案是給「後端專案」使用的範例（Node / Functions 專案）
 * - 不會在前端 bundle 中使用，請放在獨立的 Firebase Functions 專案裡
 *
 * 功能：
 * 1. onKnowledgeBaseCreate
 *    - 監聽 Firestore 路徑：users/{uid}/knowledge_base/{docId}
 *    - 新增紀錄時，自動幫 text 產生 embedding，寫回同一筆文件
 *
 * 2. searchKnowledge
 *    - Callable Function（前端透過 httpsCallable 呼叫）
 *    - 接收 queryText / topK
 *    - 產生查詢向量 → 呼叫向量庫 → 回傳最相關的知識庫紀錄
 *
 * 注意：
 * - 這裡的 generateEmbedding / vectorSearchForUser 只是一個介面示意
 * - 實際實作時，請依你選擇的向量服務（Firebase Vector Search / Pinecone 等）補上內容
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 產生文字的 embedding（向量）
 * TODO: 在這裡呼叫你選擇的 Embedding API（例如 Gemini / Vertex AI / OpenAI 等）
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  // 範例：這裡應該呼叫外部 API，回傳向量
  // 現階段先回傳空陣列，避免誤用
  functions.logger.warn('[generateEmbedding] 尚未實作，請接上實際 Embedding 服務');
  return [];
}

/**
 * 向量搜尋：根據查詢向量，找出最相關的知識庫紀錄 ID
 * TODO: 在這裡接向量搜尋服務（Firebase Vector Search / Pinecone / 其他）
 *
 * @param {string} uid - 使用者 ID
 * @param {number[]} queryEmbedding - 查詢向量
 * @param {number} topK - 取回前幾筆
 * @returns {Promise<Array<{ id: string; score: number }>>}
 */
async function vectorSearchForUser(uid, queryEmbedding, topK) {
  functions.logger.warn('[vectorSearchForUser] 尚未接上真正的向量搜尋服務');
  // 目前先回傳空陣列，代表沒有相似紀錄
  return [];
}

/**
 * Firestore Trigger：
 * 新增 users/{uid}/knowledge_base/{docId} 時，自動產生 embedding 並寫回
 */
exports.onKnowledgeBaseCreate = functions.firestore
  .document('users/{uid}/knowledge_base/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const text = data && data.text;
    if (!text) {
      return;
    }

    try {
      const embedding = await generateEmbedding(text);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        functions.logger.warn('generateEmbedding 未回傳有效向量，略過寫入 embedding');
        return;
      }

      await snap.ref.update({
        embedding,
        embeddingModel: 'text-embedding-004', // TODO: 改成你實際的模型名稱
        embeddingUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      functions.logger.error('計算或寫入 embedding 失敗', error);
    }
  });

/**
 * Callable Function：
 * 接收 queryText / topK，回傳最相關的知識庫紀錄
 *
 * 前端呼叫方式（範例）：
 * const fn = httpsCallable(functions, 'searchKnowledge');
 * const res = await fn({ queryText, topK: 5 });
 * const records = res.data.records;
 */
exports.searchKnowledge = functions.https.onCall(async (data, context) => {
  const uid = context.auth && context.auth.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', '請先登入後再使用知識庫搜尋功能');
  }

  const queryText = (data && data.queryText) || '';
  const topK = (data && data.topK) || 5;

  if (!queryText) {
    return { records: [] };
  }

  // 1) 產生查詢向量
  const queryEmbedding = await generateEmbedding(queryText);

  // 2) 呼叫向量搜尋服務
  const vectorResults = await vectorSearchForUser(uid, queryEmbedding, topK);

  if (!Array.isArray(vectorResults) || vectorResults.length === 0) {
    return { records: [] };
  }

  // 3) 根據 ID 回 Firestore 拿原始紀錄
  const ids = vectorResults.map((r) => r.id);
  const refs = ids.map((id) => db.doc(`users/${uid}/knowledge_base/${id}`));
  const snaps = await db.getAll(...refs);

  const records = snaps
    .map((snap) => {
      if (!snap.exists) return null;
      const d = snap.data();
      return {
        id: snap.id,
        text: d.text,
        metadata: d.metadata || {},
        createdAt: d.createdAt,
      };
    })
    .filter(Boolean);

  return { records };
});

