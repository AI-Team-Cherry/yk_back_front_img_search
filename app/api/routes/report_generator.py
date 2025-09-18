from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

router = APIRouter(prefix="/report_generator", tags=["Report Generator"])

class ReportRequest(BaseModel):
    from_: str = Field(..., alias="from")
    to: str
    format: str = "pdf"

    class Config:
        populate_by_name = True

# 메모리 캐시 (실제로는 MongoDB 같은 DB에 저장하는 게 바람직)
REPORTS: Dict[str, Dict[str, Any]] = {}

@router.get("/list")
async def list_reports() -> Dict[str, Any]:
    """보고서 목록 조회"""
    return {"items": list(REPORTS.values())}

@router.post("/generate")
async def generate_report(req: ReportRequest):
    report_id = str(uuid.uuid4())
    REPORTS[report_id] = {
        "id": report_id,
        "title": f"Report {req.from_} ~ {req.to}",
        "createdAt": datetime.utcnow().isoformat(),
        "format": req.format,
    }
    return {"reportId": report_id, "message": "보고서 생성 완료"}

@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """보고서 다운로드 (지금은 목업)"""
    report = REPORTS.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    from fastapi.responses import StreamingResponse
    import io

    content = f"Report {report['title']} ({report['format']})\nGenerated at {report['createdAt']}"
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report_id}.{report['format']}"
        }
    )
