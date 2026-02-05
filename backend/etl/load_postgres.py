"""
Agentic RAG Phase 1-2：載入 PostgreSQL
讀取 ETL 轉換後的 JSON，寫入 PostgreSQL
依賴：pip install psycopg2-binary
環境變數：DATABASE_URL (例：postgresql://user:pass@localhost:5432/my_ai_coach)
"""

import os
import json
import sys
import uuid


def get_connection():
    import psycopg2
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("請設定環境變數 DATABASE_URL")
    return psycopg2.connect(url)


def ensure_user(conn, user_id: str):
    """確保 users 表中有對應紀錄"""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (id) VALUES (%s) ON CONFLICT (id) DO NOTHING",
        (user_id,),
    )
    conn.commit()
    cur.close()


def load_workouts(conn, workouts: list[dict]):
    """將 workouts 寫入 PostgreSQL"""
    cur = conn.cursor()
    for w in workouts:
        cur.execute(
            """
            INSERT INTO workouts (id, user_id, date, type, status, distance_m, duration_s, heart_rate, pace_str, raw)
            VALUES (%(id)s, %(user_id)s, %(date)s, %(type)s, %(status)s, %(distance_m)s, %(duration_s)s, %(heart_rate)s, %(pace_str)s, %(raw)s)
            ON CONFLICT (id) DO UPDATE SET
                date = EXCLUDED.date, type = EXCLUDED.type, status = EXCLUDED.status,
                distance_m = EXCLUDED.distance_m, duration_s = EXCLUDED.duration_s,
                heart_rate = EXCLUDED.heart_rate, pace_str = EXCLUDED.pace_str,
                raw = EXCLUDED.raw, updated_at = now()
            """,
            {
                "id": w.get("id") or f"w_{w.get('date', '')}_{uuid.uuid4().hex[:12]}",
                "user_id": w["user_id"],
                "date": w["date"],
                "type": w.get("type", "run"),
                "status": w.get("status", "completed"),
                "distance_m": w.get("distance_m"),
                "duration_s": w.get("duration_s"),
                "heart_rate": w.get("heart_rate"),
                "pace_str": w.get("pace_str") or "",
                "raw": json.dumps(w.get("raw") or {}),
            },
        )
    conn.commit()
    cur.close()


def load_knowledge_base(conn, records: list[dict]):
    """將 knowledge_base 寫入 PostgreSQL（不含 embedding）"""
    cur = conn.cursor()
    for r in records:
        cur.execute(
            """
            INSERT INTO knowledge_base (id, user_id, type, text, metadata)
            VALUES (%(id)s, %(user_id)s, %(type)s, %(text)s, %(metadata)s)
            ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type, text = EXCLUDED.text, metadata = EXCLUDED.metadata
            """,
            {
                "id": r.get("id") or f"kb_{uuid.uuid4().hex[:12]}",
                "user_id": r["user_id"],
                "type": r.get("type", "note"),
                "text": r["text"],
                "metadata": json.dumps(r.get("metadata") or {}),
            },
        )
    conn.commit()
    cur.close()


def main():
    if len(sys.argv) < 2:
        print("用法: python load_postgres.py <transform_output.json>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    conn = get_connection()
    try:
        user_ids = set()
        for w in data.get("workouts") or []:
            user_ids.add(w.get("user_id"))
        for r in data.get("knowledge_base") or []:
            user_ids.add(r.get("user_id"))
        for uid in user_ids:
            if uid:
                ensure_user(conn, uid)

        if data.get("workouts"):
            load_workouts(conn, data["workouts"])
            print(f"已載入 {len(data['workouts'])} 筆 workouts")
        if data.get("knowledge_base"):
            load_knowledge_base(conn, data["knowledge_base"])
            print(f"已載入 {len(data['knowledge_base'])} 筆 knowledge_base")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
