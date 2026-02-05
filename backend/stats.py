"""
Agentic RAG Phase 1 - 統計 API
計算指定日期範圍內的訓練指標（心率、距離、跑量等）
未來可接 PostgreSQL；目前接受 workouts 陣列作為輸入。
"""

from typing import Any


def _parse_float(val: Any) -> float:
    """安全解析浮點數"""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    # 處理 "140-150" 格式取第一個數字
    if "-" in s and not s.startswith("-"):
        s = s.split("-")[0].strip()
    # 移除 bpm 等單位
    for suffix in ("bpm", "BPM", " "):
        s = s.replace(suffix, "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _in_date_range(workout: dict, start_date: str, end_date: str) -> bool:
    """檢查 workout 的 date 是否在範圍內"""
    date = workout.get("date") or workout.get("dateStr") or ""
    if not date:
        return False
    return start_date <= date <= end_date


def _filter_run_workouts(workouts: list[dict], start_date: str, end_date: str) -> list[dict]:
    """篩選日期範圍內的跑步紀錄"""
    return [
        w
        for w in workouts
        if w.get("type") == "run"
        and w.get("status") == "completed"
        and _in_date_range(w, start_date, end_date)
    ]


def calculate_stats(
    workouts: list[dict],
    start_date: str,
    end_date: str,
    field: str,
) -> float | None:
    """
    計算指定日期範圍內的統計值。

    Args:
        workouts: 訓練紀錄陣列（來自 Firestore 匯出或未來 PostgreSQL）
        start_date: 起始日期 YYYY-MM-DD
        end_date: 結束日期 YYYY-MM-DD
        field: 要計算的欄位
            - "avg_heart_rate": 平均心率 (bpm)
            - "total_distance": 總跑量 (km)
            - "total_duration": 總訓練時間 (分鐘)
            - "run_count": 跑步次數
            - "avg_pace_min_per_km": 平均配速 (min/km，需有 runPace 或 runDuration/runDistance)

    Returns:
        計算結果（浮點數），無資料時回傳 None
    """
    runs = _filter_run_workouts(workouts, start_date, end_date)
    if not runs:
        return None

    if field == "run_count":
        return float(len(runs))

    if field == "total_distance":
        total = sum(_parse_float(w.get("runDistance")) for w in runs)
        return round(total, 2) if total > 0 else None

    if field == "total_duration":
        total = sum(_parse_float(w.get("runDuration")) for w in runs)
        return round(total, 1) if total > 0 else None

    if field == "avg_heart_rate":
        hrs = []
        for w in runs:
            hr = _parse_float(w.get("runHeartRate"))
            if hr > 0:
                hrs.append(hr)
        if not hrs:
            return None
        return round(sum(hrs) / len(hrs), 1)

    if field == "avg_pace_min_per_km":
        paces = []
        for w in runs:
            pace_str = w.get("runPace") or ""
            dist = _parse_float(w.get("runDistance"))
            dur = _parse_float(w.get("runDuration"))
            if dist > 0 and dur > 0:
                # min/km = duration(min) / distance(km)
                paces.append(dur / dist)
            elif pace_str and ":" in pace_str:
                # 解析 "5:30" 格式
                parts = pace_str.replace("/km", "").replace('"', "").split(":")
                if len(parts) >= 2:
                    try:
                        mins = float(parts[0]) + float(parts[1]) / 60
                        paces.append(mins)
                    except ValueError:
                        pass
        if not paces:
            return None
        return round(sum(paces) / len(paces), 2)

    return None
