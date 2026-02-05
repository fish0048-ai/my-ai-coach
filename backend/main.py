"""
Agentic RAG Phase 1 - FastAPI 統計 API
提供 calculate_stats 的 HTTP 介面，供未來 LLM Function Calling 呼叫。
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from stats import calculate_stats

app = FastAPI(
    title="My AI Coach - 統計 API",
    description="Agentic RAG Phase 1：訓練數據統計，供 LLM Function Calling 使用",
    version="0.1.0",
)


class StatsRequest(BaseModel):
    """統計請求"""
    workouts: list[dict] = Field(description="訓練紀錄陣列（可從 Firestore 匯出）")
    start_date: str = Field(description="起始日期 YYYY-MM-DD")
    end_date: str = Field(description="結束日期 YYYY-MM-DD")
    field: str = Field(
        description="統計欄位: avg_heart_rate, total_distance, total_duration, run_count, avg_pace_min_per_km"
    )


class StatsResponse(BaseModel):
    """統計回應"""
    value: float | None
    field: str
    start_date: str
    end_date: str
    unit: str = ""


@app.get("/health")
def health():
    """健康檢查"""
    return {"status": "ok", "phase": "agentic-rag-1"}


@app.post("/stats", response_model=StatsResponse)
def get_stats(req: StatsRequest):
    """
    計算指定日期範圍的統計值。
    測試範例：查詢過去 7 天的平均心率。
    """
    units = {
        "avg_heart_rate": "bpm",
        "total_distance": "km",
        "total_duration": "min",
        "run_count": "次",
        "avg_pace_min_per_km": "min/km",
    }
    value = calculate_stats(
        req.workouts,
        req.start_date,
        req.end_date,
        req.field,
    )
    return StatsResponse(
        value=value,
        field=req.field,
        start_date=req.start_date,
        end_date=req.end_date,
        unit=units.get(req.field, ""),
    )
