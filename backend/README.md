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

## 後續 Phase 1 步驟

1. **資料庫選型**：安裝 PostgreSQL + pgvector
2. **ETL**：將 Firestore 訓練資料匯入 PostgreSQL（距離用 meter、時間用 second）
3. **改寫 stats.py**：從 PostgreSQL 查詢取代傳入 workouts 陣列
