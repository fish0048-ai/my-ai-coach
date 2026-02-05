# Agentic RAG Phase 1-2：資料清洗 ETL

將 Firestore 資料轉換並載入 PostgreSQL。

## 前置條件

1. PostgreSQL 已安裝並啟用 pgvector
2. 已執行 `schema.sql` 建立資料表
3. 準備好 Firestore 匯出的 JSON 檔案（格式見下方）

## 匯出 Firestore 資料

可使用 Firebase Console 匯出，或於前端 App 實作匯出功能。預期 JSON 格式：

```json
{
  "user_id": "firebase_uid_xxx",
  "workouts": [
    {
      "id": "docId",
      "date": "2025-01-20",
      "type": "run",
      "status": "completed",
      "runDistance": 5.2,
      "runDuration": 30,
      "runHeartRate": 145,
      "runPace": "5:45/km"
    }
  ],
  "knowledge_base": [
    {
      "id": "docId",
      "type": "note",
      "text": "長距離後左膝外側緊繃...",
      "metadata": { "date": "2025-01-15", "typeLabel": "訓練日記" }
    }
  ]
}
```

## 轉換（Transform）

數值單位統一：
- `runDistance` (km) → `distance_m` (meter)
- `runDuration` (min) → `duration_s` (second)
- 文字去除 HTML 標籤

```bash
cd backend
python -m etl.transform < firestore_export.json > transformed.json
```

## 載入（Load）

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/my_ai_coach"
python -m etl.load_postgres transformed.json
```

## 單一指令管線

```bash
python -m etl.transform < firestore_export.json | python -c "
import json, sys
data = json.load(sys.stdin)
with open('transformed.json','w') as f:
  json.dump(data, f, ensure_ascii=False, indent=2)
"
python -m etl.load_postgres transformed.json
```
