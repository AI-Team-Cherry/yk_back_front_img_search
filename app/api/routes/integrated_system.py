# app/api/routes/integrated_system.py
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime

router = APIRouter(prefix="/integrated_system", tags=["Integrated System"])

# 메모리 캐시 (실제로는 DB나 외부 시스템 상태 확인해야 함)
SYSTEM_STATUS: Dict[str, Any] = {
    "status": "idle",
    "lastSync": None,
    "message": "시스템 대기 중"
}

@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """외부 시스템 연동 상태 확인"""
    return SYSTEM_STATUS

@router.post("/sync")
async def trigger_sync() -> Dict[str, Any]:
    """외부 시스템 동기화 트리거"""
    try:
        SYSTEM_STATUS.update({
            "status": "synced",
            "lastSync": datetime.utcnow().isoformat(),
            "message": "동기화 성공"
        })
        return SYSTEM_STATUS
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"동기화 실패: {str(e)}")
