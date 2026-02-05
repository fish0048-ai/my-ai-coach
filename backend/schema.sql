-- Agentic RAG Phase 1 - PostgreSQL + pgvector Schema
-- 執行前需先啟用 pgvector：CREATE EXTENSION IF NOT EXISTS vector;

-- 啟用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 使用者（與 Firebase Auth UID 對應）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 訓練紀錄（結構化，取代 Firestore calendar）
-- 單位：distance_m 米、duration_s 秒、heart_rate bpm
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'run',
  status TEXT DEFAULT 'completed',
  distance_m NUMERIC(12,2),
  duration_s NUMERIC(12,2),
  heart_rate NUMERIC(6,2),
  pace_str TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_type_status ON workouts(user_id, type, status);

-- 知識庫（非結構化，支援向量搜尋）
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(768),
  embedding_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_user ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_type ON knowledge_base(user_id, type);
-- 向量相似度搜尋（資料量足夠時再建立，可選）
-- CREATE INDEX idx_kb_embedding ON knowledge_base
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
--   WHERE embedding IS NOT NULL;
