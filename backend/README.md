# Agentic RAG 後端 - Phase 1

統計 API 骨架，供未來 LLM Function Calling 使用。

## 快速開始

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API 文件：http://localhost:8000/docs
- 健康檢查：http://localhost:8000/health

## 測試統計 API

```bash
# 查詢過去 7 天平均心率（需先準備 workouts JSON）
curl -X POST http://localhost:8000/stats \
  -H "Content-Type: application/json" \
  -d '{
    "workouts": [...],
    "start_date": "2025-01-20",
    "end_date": "2025-01-26",
    "field": "avg_heart_rate"
  }'
```

## 支援的 field

| field | 說明 | 單位 |
|-------|------|------|
| avg_heart_rate | 平均心率 | bpm |
| total_distance | 總跑量 | km |
| total_duration | 總訓練時間 | min |
| run_count | 跑步次數 | 次 |
| avg_pace_min_per_km | 平均配速 | min/km |

## PostgreSQL + pgvector (rag-p1-1)

1. 安裝 PostgreSQL 與 [pgvector](https://github.com/pgvector/pgvector)
2. 建立資料庫：`createdb my_ai_coach`
3. 執行 Schema：`psql my_ai_coach < schema.sql`
4. 詳見 `schema.sql` 註解

## 資料清洗 ETL (rag-p1-2)

1. 從 Firestore 匯出 JSON（含 `user_id`, `workouts`, `knowledge_base`）
2. 轉換：`python -m etl.transform < export.json > transformed.json`
3. 載入：`DATABASE_URL=postgresql://... python -m etl.load_postgres transformed.json`
4. 詳見 `etl/README.md`
