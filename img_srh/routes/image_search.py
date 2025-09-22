from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import Optional
from pathlib import Path
import os

from ..services.image_gen import generate_image
from ..utils.translate import translate_fashion_query_ko2en

router = APIRouter()

# 이미지 디렉토리 경로
IMAGES_DIR = Path(__file__).parent.parent / "data" / "images"

# 공통 유틸
def _clamp_limit(n: int) -> int:
    """limit을 1~9 사이로 강제"""
    try:
        n = int(n)
    except Exception:
        n = 9
    return max(1, min(n, 9))

def _safe_image_path(filename: str) -> Path:
    """파일명 검증 + 안전한 경로 반환"""
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = IMAGES_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return file_path

def _format_response(images: list, query_original: str, query_used: str) -> dict:
    """응답 구조 통일"""
    return {
        "queryOriginal": query_original,
        "queryUsed": query_used,
        "images": images,
        "totalCount": len(images),
    }

# 라우트
@router.get("/list")
async def list_images(
    query: Optional[str] = Query(None, description="검색 쿼리"),
    limit: int = Query(9, description="반환할 이미지 개수 (최대 9)"),
):
    """이미지 목록 반환 (파일명 기반 간단 필터)"""
    try:
        limit = _clamp_limit(limit)
        original_q = (query or "").strip()
        query_used = translate_fashion_query_ko2en(original_q) if original_q else original_q

        # 파일 목록 불러오기
        image_files = [
            f for f in os.listdir(IMAGES_DIR)
            if f.endswith(".jpg") and not f.endswith(".jpg:Zone.Identifier")
        ]

        # 파일명 기반 간단 검색
        if query_used:
            image_files = [f for f in image_files if query_used.lower() in f.lower()]

        # limit 적용
        image_files = image_files[:limit]

        images = []
        for idx, filename in enumerate(image_files):
            base_name = filename[:-4]  # .jpg 제거
            parts = base_name.split("_")
            images.append({
                "id": str(idx + 1),
                "filename": filename,
                "url": f"/api/images/file/{filename}",
                "title": f"상품 {parts[0]}" if parts else filename,
                "description": f"이미지 번호: {base_name}",
                "tags": [f"상품번호_{parts[0]}"] if parts else [],
                "relevance": 0.95 - (idx * 0.05),
            })

        return _format_response(images, original_q, query_used)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file/{filename}")
async def get_image(filename: str):
    """특정 이미지 파일 반환"""
    file_path = _safe_image_path(filename)
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        },
    )

@router.get("/download/{filename}")
async def download_image(filename: str):
    """이미지 다운로드"""
    file_path = _safe_image_path(filename)
    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=filename,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@router.get("/search")
async def search_images(q: str, limit: int = 9):
    """자연어 검색 API (한국어 → 영어 변환 + 최대 9개)"""
    try:
        limit = _clamp_limit(limit)
        original_q = (q or "").strip()
        query_used = translate_fashion_query_ko2en(original_q)

        print(f"[ImageSearch] original='{original_q}' | used='{query_used}' | limit={limit}")

        # AI 검색
        result = await generate_image(query_used, limit)

        # generate_image가 limit을 무시하는 경우 대비
        images = result.get("images", [])[:limit]

        return _format_response(images, original_q, query_used)

    except Exception as e:
        print(f"AI 검색 실패: {e}")
        try:
            # Fallback
            fallback = await list_images(query=q, limit=limit)
            return fallback
        except Exception:
            raise HTTPException(status_code=500, detail=f"검색 실패: {str(e)}")
