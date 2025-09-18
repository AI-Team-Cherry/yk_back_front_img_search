from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from app.services.image_gen import generate_image
import os
from pathlib import Path

router = APIRouter()

# 이미지 디렉토리 경로
IMAGES_DIR = Path(__file__).parent.parent.parent / "img_search" / "only_product_images"

@router.get("/list")
async def list_images(
    query: Optional[str] = Query(None, description="검색 쿼리"),
    limit: int = Query(20, description="반환할 이미지 개수")
):
    """이미지 목록 반환"""
    try:
        # 실제 이미지 파일들만 필터링 (.jpg 확장자만)
        image_files = [
            f for f in os.listdir(IMAGES_DIR) 
            if f.endswith('.jpg') and not f.endswith('.jpg:Zone.Identifier')
        ]
        
        # 검색 쿼리가 있으면 파일명 기반 필터링 (간단한 구현)
        if query:
            query_lower = query.lower()
            image_files = [f for f in image_files if query_lower in f.lower()]
        
        # limit 적용
        image_files = image_files[:limit]
        
        # 이미지 정보 구성
        images = []
        for idx, filename in enumerate(image_files):
            # 파일명에서 정보 추출 (예: 2005113_5.jpg -> id: 2005113)
            base_name = filename.replace('.jpg', '')
            parts = base_name.split('_')
            
            images.append({
                "id": str(idx + 1),
                "filename": filename,
                "url": f"/api/images/file/{filename}",
                "title": f"상품 {parts[0]}" if parts else filename,
                "description": f"이미지 번호: {base_name}",
                "tags": [f"상품번호_{parts[0]}"] if parts else [],
                "relevance": 0.95 - (idx * 0.05)  # 임시 관련도
            })
        
        return {
            "query": query or "",
            "images": images,
            "totalCount": len(images),
            
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file/{filename}")
async def get_image(filename: str):
    """특정 이미지 파일 반환"""
    # 보안을 위해 경로 탐색 방지
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.get("/download/{filename}")
async def download_image(filename: str):
    """이미지 다운로드"""
    # 보안을 위해 경로 탐색 방지
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    
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
        }
    )

@router.get("/search")
async def search_images(q: str, limit: int = 20):
    

    """자연어 검색 API"""
    # 현재는 간단한 키워드 매칭으로 구현
    # 실제로는 여기서 벡터 검색이나 AI 모델을 사용할 수 있음
    
    try:
        # AI 이미지 검색 사용
        result = await generate_image(q, limit)
        return result
        
    except Exception as e:
        # AI 검색 실패 시 기본 검색으로 fallback
        print(f"AI 검색 실패: {e}")
        try:
            result = await list_images(query=q, limit=limit)
            return result
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"검색 실패: {str(e)}")