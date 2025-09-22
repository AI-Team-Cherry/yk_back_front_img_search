from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from pathlib import Path
import os
import tempfile
import shutil
import httpx
import re

from app.services.image_gen import generate_image
from app.services.gemini_service import gemini_service
from app.utils.translate import translate_fashion_query_ko2en  # 한국어 쿼리 번역 유틸

router = APIRouter()

COLAB_BASE_URL = os.getenv("COLAB_BASE_URL")

# 이미지 디렉토리 경로
IMAGES_DIR = Path(__file__).parent.parent.parent / "img_search" / "only_product_images"


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

'''
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
'''
@router.get("/search")
async def search_images(q: str, limit: int = 9):
    """자연어 검색 API (한국어 → 영어 변환 + 추상 질의 해석 + 최대 9개)"""
    try:
        limit = _clamp_limit(limit)
        original_q = (q or "").strip()
        if not original_q:
            raise HTTPException(status_code=400, detail="검색어가 필요합니다.")

        # 1️⃣ 한국어 → 영어 직역
        base_query = translate_fashion_query_ko2en(original_q)

        # 2️⃣ Colab LLM 호출
        query_used = base_query
        if COLAB_BASE_URL:
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    res = await client.post(
                        f"{COLAB_BASE_URL}/fashion-query",
                        json={"query": original_q, "base_query": base_query},
                    )
                if res.status_code == 200:
                    colab_data = res.json()
                    query_used = colab_data.get("query_used", base_query).strip()
            except Exception as e:
                print("❌ Colab 요청 실패, fallback 사용:", e)

        # 🔹 후처리: 너무 긴 문장 → 10단어 이하로 압축
        query_used = " ".join(query_used.split()[:10])

        print(f"[ImageSearch] original='{original_q}' | used='{query_used}' | limit={limit}")

        # 3️⃣ CLIP 검색
        result = await generate_image(query_used, limit)
        images = result.get("images", [])[:limit]

        return _format_response(images, original_q, query_used)

    except Exception as e:
        print(f"AI 검색 실패: {e}")
        try:
            fallback = await list_images(query=q, limit=limit)
            return fallback
        except Exception:
            raise HTTPException(status_code=500, detail=f"검색 실패: {str(e)}")



@router.post("/search-by-image")
async def search_images_by_file(file: UploadFile = File(...), limit: int = 9):
    """이미지 파일로 검색 API"""
    try:
        limit = _clamp_limit(limit)

        # 이미지 파일 검증
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")

        # 파일 크기 제한 (10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")

        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
            # 파일 내용을 임시 파일에 복사
            shutil.copyfileobj(file.file, tmp_file)
            tmp_file_path = tmp_file.name

        try:
            print(f"[ImageSearch] Uploaded file: {file.filename} | Size: {file.size} bytes")

            # TODO: 실제 이미지 유사도 검색 구현
            # 현재는 모크 데이터로 응답
            # 향후 CLIP 모델이나 다른 이미지 유사도 검색 모델 연동 필요

            # 임시로 일반 검색 결과 반환 (유사 이미지 검색 구현 전까지)
            fallback_result = await list_images(query=None, limit=limit)

            # 응답 형태 조정
            return {
                "queryOriginal": f"이미지 파일: {file.filename}",
                "queryUsed": "image_search",
                "images": fallback_result["images"],
                "totalCount": fallback_result["totalCount"],
                "searchTime": 0.1
            }

        finally:
            # 임시 파일 정리
            try:
                os.unlink(tmp_file_path)
            except:
                pass

    except HTTPException:
        raise
    except Exception as e:
        print(f"이미지 검색 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 검색 실패: {str(e)}")


@router.post("/compose-fashion")
async def compose_fashion_images(
    model_image: UploadFile = File(..., description="모델 이미지"),
    clothing_1: Optional[UploadFile] = File(None, description="의류 이미지 1"),
    clothing_2: Optional[UploadFile] = File(None, description="의류 이미지 2"),
    clothing_3: Optional[UploadFile] = File(None, description="의류 이미지 3"),
    clothing_4: Optional[UploadFile] = File(None, description="의류 이미지 4"),
    custom_prompt: Optional[str] = Form(None, description="사용자 정의 프롬프트")
):
    """패션 모델에게 옷을 착용시키는 이미지 합성 API"""
    try:
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini 서비스를 사용할 수 없습니다. API 키를 확인해주세요.")

        # 모델 이미지 검증
        if not model_image.content_type or not model_image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="모델 이미지는 이미지 파일이어야 합니다.")

        # 의류 이미지들을 리스트로 수집
        clothing_images = []
        for clothing_file in [clothing_1, clothing_2, clothing_3, clothing_4]:
            if clothing_file:
                if not clothing_file.content_type or not clothing_file.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="모든 의류 이미지는 이미지 파일이어야 합니다.")
                clothing_images.append(clothing_file)

        if not clothing_images:
            raise HTTPException(status_code=400, detail="최소 하나의 의류 이미지가 필요합니다.")

        if len(clothing_images) > 4:
            raise HTTPException(status_code=400, detail="최대 4개의 의류 이미지만 업로드할 수 있습니다.")

        print(f"[Fashion Compose] 모델: {model_image.filename}, 의류 개수: {len(clothing_images)}")

        # Gemini 서비스로 이미지 합성 요청
        gemini_result = await gemini_service.compose_fashion_images(
            model_image=model_image,
            clothing_images=clothing_images,
            custom_prompt=custom_prompt
        )

        # 이미지가 생성되었는지 확인
        if gemini_result["type"] == "fashion_image_generation":
            return {
                "message": "패션 이미지 합성이 완료되었습니다",
                "model_image": model_image.filename,
                "clothing_count": len(clothing_images),
                "image_url": gemini_result["image_url"],
                "analysis": gemini_result["analysis"],
                "type": gemini_result["type"],
                "processing_time": "2.5초"
            }
        else:
            return {
                "message": "패션 이미지 분석이 완료되었습니다",
                "model_image": model_image.filename,
                "clothing_count": len(clothing_images),
                "result_url": gemini_result.get("file_url"),
                "analysis": gemini_result["analysis"],
                "type": gemini_result["type"],
                "processing_time": "2.5초"
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"패션 이미지 합성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"패션 이미지 합성 실패: {str(e)}")


@router.get("/generated/{filename}")
async def get_generated_image(filename: str):
    """생성된 이미지 파일 반환"""
    try:
        # 생성된 이미지 디렉토리
        generated_dir = Path(__file__).parent.parent.parent / "img_search" / "generated_images"

        if ".." in filename or "/" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        file_path = generated_dir / filename
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Generated image not found")

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 로드 실패: {str(e)}")


@router.post("/generate-fashion")
async def generate_fashion_image(
    prompt: str = Form(..., description="이미지 생성 프롬프트")
):
    """텍스트 프롬프트로부터 패션 이미지 생성"""
    try:
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini 서비스를 사용할 수 없습니다. API 키를 확인해주세요.")

        if not prompt.strip():
            raise HTTPException(status_code=400, detail="프롬프트를 입력해주세요.")

        print(f"[Fashion Generate] 프롬프트: {prompt}")

        # Gemini 서비스로 이미지 생성 요청
        result_url = await gemini_service.generate_fashion_image(prompt)

        return {
            "message": "패션 이미지 생성이 완료되었습니다",
            "prompt": prompt,
            "result_url": result_url,
            "processing_time": "3.0초"  # 실제로는 측정된 시간 사용
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"패션 이미지 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"패션 이미지 생성 실패: {str(e)}")