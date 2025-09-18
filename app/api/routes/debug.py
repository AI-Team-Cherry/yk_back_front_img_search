# app/api/routes/debug.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

router = APIRouter(prefix="/debug", tags=["Debug"])

class DebugRequest(BaseModel):
    text: str
    model: str = "intfloat/multilingual-e5-small"

@router.post("/model")
async def debug_model(req: DebugRequest) -> Dict[str, Any]:
    """모델 디버그 API (목업)"""
    # TODO: 실제 HuggingFace/내부 모델 호출 로직으로 교체 가능
    return {
        "input_text": req.text,
        "model": req.model,
        "output": f"[{req.model}] '{req.text}' → 분석 결과 예시",
        "timestamp": datetime.utcnow().isoformat()
    }
