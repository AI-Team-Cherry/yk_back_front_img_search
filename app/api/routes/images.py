from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional
from pathlib import Path
import os, io
from PIL import Image
from time import perf_counter

from app.services.embedding_index import init_indices, search_by_text, search_by_image

router = APIRouter()
IMAGES_DIR = Path(__file__).resolve().parents[2] / "img_search" / "only_product_images"

def _clamp(n: int) -> int:
    try: n = int(n)
    except: n = 9
    return max(1, min(n, 9))

def _safe_path(filename: str) -> Path:
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    p = IMAGES_DIR / filename
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return p

def _resp(images: list, q_orig: str, q_used: str, took: float=0.0) -> dict:
    return {
        "queryOriginal": q_orig,
        "queryUsed": q_used,
        "images": images,
        "totalCount": len(images),
        "searchTime": took
    }

@router.on_event("startup")
async def _startup():
    try:
        init_indices()
    except Exception as e:
        print("[ImageSearch] init failed:", repr(e))

@router.get("/list")
async def list_images(query: Optional[str]=Query(None), limit: int=9):
    limit = _clamp(limit)
    q_orig = (query or "").strip()
    q_used = q_orig
    files = [f for f in os.listdir(IMAGES_DIR)
             if f.lower().endswith((".jpg",".jpeg",".png",".webp"))
             and not f.lower().endswith(".jpg:zone.identifier")]
    if q_used:
        files = [f for f in files if q_used.lower() in f.lower()]
    files = files[:limit]
    images = [{
        "id": str(i+1),
        "filename": fn,
        "url": f"/api/images/file/{fn}",
        "title": f"상품 {i+1}",
        "description": fn,
        "tags": [],
        "relevance": max(0.0, 0.95 - 0.05*i)
    } for i, fn in enumerate(files)]
    return _resp(images, q_orig, q_used, 0.0)

@router.get("/file/{filename}")
async def get_image(filename: str):
    return FileResponse(str(_safe_path(filename)), media_type="image/jpeg")

@router.get("/download/{filename}")
async def download_image(filename: str):
    p = _safe_path(filename)
    return FileResponse(str(p), media_type="application/octet-stream", filename=filename,
                        headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/search")
async def search_images(q: str, limit: int = 9):
    limit = _clamp(limit)
    q_orig = (q or "").strip()
    q_used = q_orig
    try:
        t0 = perf_counter()
        images = search_by_text(q_used, topk=limit)
        took = perf_counter() - t0
        return _resp(images[:limit], q_orig, q_used, took)
    except Exception as e:
        # 상세 에러 표시 (개발 단계에서만)
        raise HTTPException(status_code=500, detail=f"[TEXT SEARCH ERROR] {repr(e)}")

@router.post("/search-by-image")
async def search_images_by_file(file: UploadFile = File(...), limit: int = 9):
    limit = _clamp(limit)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
    raw = await file.read()
    try:
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except:
        raise HTTPException(status_code=400, detail="손상된 이미지거나 인식할 수 없습니다.")
    try:
        t0 = perf_counter()
        images = search_by_image(pil, topk=limit)
        took = perf_counter() - t0
        return _resp(images[:limit], f"이미지 파일: {file.filename}", "image_search", took)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"[IMAGE SEARCH ERROR] {repr(e)}")