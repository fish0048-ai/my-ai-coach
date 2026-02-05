"""
Agentic RAG Phase 1-2：資料清洗 ETL
將 Firestore 匯出的 JSON 轉換為 PostgreSQL 所需格式
- 數值欄位：距離統一用 meter，時間統一用 second
- 文字欄位：去除 HTML 標籤
"""

import re
import json


def _strip_html(text: str) -> str:
    """去除 HTML 標籤"""
    if not text or not isinstance(text, str):
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_float(val) -> float:
    """安全解析浮點數"""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if "-" in s and not s.startswith("-"):
        s = s.split("-")[0].strip()
    for suffix in ("bpm", "BPM", "km", "min", " "):
        s = s.replace(suffix, "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def transform_workout(w: dict, user_id: str) -> dict | None:
    """
    單筆訓練紀錄清洗
    輸入：Firestore calendar 格式 { runDistance(km), runDuration(min), runHeartRate, ... }
    輸出：PostgreSQL workouts 格式 { distance_m, duration_s, heart_rate, ... }
    """
    if not w.get("date"):
        return None

    dist_km = _parse_float(w.get("runDistance") or w.get("distance"))
    dur_min = _parse_float(w.get("runDuration") or w.get("duration"))
    distance_m = dist_km * 1000 if dist_km else None
    duration_s = dur_min * 60 if dur_min else None
    hr = _parse_float(w.get("runHeartRate"))
    heart_rate = hr if hr > 0 else None

    return {
        "id": w.get("id") or "",
        "user_id": user_id,
        "date": w["date"],
        "type": w.get("type") or "run",
        "status": w.get("status") or "completed",
        "distance_m": distance_m,
        "duration_s": duration_s,
        "heart_rate": heart_rate,
        "pace_str": w.get("runPace") or w.get("pace_str") or "",
        "raw": {k: v for k, v in w.items() if k not in ("id", "user_id", "date", "type", "status", "distance_m", "duration_s", "heart_rate", "pace_str")},
    }


def transform_knowledge_record(rec: dict, user_id: str) -> dict | None:
    """
    單筆知識庫紀錄清洗
    輸入：Firestore knowledge_base 格式
    輸出：PostgreSQL knowledge_base 格式（不含 embedding，由後續 Pipeline 產生）
    """
    if not rec.get("text"):
        return None

    return {
        "id": rec.get("id") or "",
        "user_id": user_id,
        "type": rec.get("type") or "note",
        "text": _strip_html(rec.get("text", "")),
        "metadata": rec.get("metadata") or {},
    }


def transform_workouts_batch(workouts: list[dict], user_id: str) -> list[dict]:
    """批次轉換訓練紀錄"""
    result = []
    for w in workouts:
        t = transform_workout(w, user_id)
        if t:
            result.append(t)
    return result


def transform_knowledge_batch(records: list[dict], user_id: str) -> list[dict]:
    """批次轉換知識庫紀錄"""
    result = []
    for r in records:
        t = transform_knowledge_record(r, user_id)
        if t:
            result.append(t)
    return result


def main():
    """CLI：讀取 stdin JSON，輸出轉換後 JSON"""
    import sys

    data = json.load(sys.stdin)
    user_id = data.get("user_id", "unknown")

    output = {}
    if "workouts" in data:
        output["workouts"] = transform_workouts_batch(data["workouts"], user_id)
    if "knowledge_base" in data:
        output["knowledge_base"] = transform_knowledge_batch(data["knowledge_base"], user_id)

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
