# app/api/routes/ingest.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any
from datetime import datetime
import os
import shutil
import uuid

router = APIRouter(prefix="/ingest", tags=["Ingest"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def ingest_file(file: UploadFile = File(...), kind: str = Form("generic")) -> Dict[str, Any]:
    """데이터 업로드 & 저장"""
    try:
        job_id = str(uuid.uuid4())
        save_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # TODO: 업로드된 파일을 ETL 파이프라인에 넘기거나 Mongo에 기록하는 로직 추가 가능
        return {
            "jobId": job_id,
            "message": f"{kind} 파일 업로드 성공",
            "filePath": save_path,
            "uploadedAt": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")
