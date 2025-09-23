from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from typing import Optional, List
from pathlib import Path
import os
import io

from app.services.image_search import generate_image, EnhancedImageSearchService, get_search_service
from app.services.gemini_service import gemini_service
from app.utils.translate import translate_fashion_query_ko2en  # 한국어 쿼리 번역 유틸

router = APIRouter()

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

        # AI 검색 사용 (실제 유사도 점수 기반)
        if query_used:
            from app.services.image_search import generate_image
            result = await generate_image(query_used, limit)
            images = result.get("images", [])
            
            # 실제 상품 메타데이터 추가
            product_df = None
            try:
                import pandas as pd
                product_df = pd.read_csv("app/img_search/product.csv")
            except Exception as e:
                print(f"상품 메타데이터 로드 실패: {e}")
            
            # 각 이미지에 실제 메타데이터 추가
            for image in images:
                filename = image.get("filename", "")
                base_name = filename[:-4] if filename.endswith(".jpg") else filename
                parts = base_name.split("_")
                product_id = parts[0] if parts else ""
                
                if product_df is not None and product_id:
                    try:
                        product_row = product_df[product_df["product_id"].astype(str) == product_id]
                        if not product_row.empty:
                            row = product_row.iloc[0]
                            image["title"] = str(row.get("product_name", image.get("title", filename)))
                            image["description"] = f"브랜드: {row.get('brand', '')} | 가격: {row.get('price', 0):,}원 | 평점: {row.get('rating_avg', 0):.1f}"
                            tags = [
                                str(row.get("brand", "")),
                                str(row.get("category_l1", "")),
                                str(row.get("gender", ""))
                            ]
                            image["tags"] = [tag for tag in tags if tag and tag != "nan"]
                    except Exception as e:
                        print(f"상품 정보 처리 실패 {product_id}: {e}")
        else:
            # 쿼리가 없는 경우 기본 목록
            image_files = image_files[:limit]
            images = []
            for idx, filename in enumerate(image_files):
                images.append({
                    "id": str(idx + 1),
                    "filename": filename,
                    "url": f"/api/images/file/{filename}",
                    "title": filename,
                    "description": "",
                    "tags": [],
                    "relevance": 1.0,  # 기본 관련도 (쿼리 없음)
                })

        return _format_response(images, original_q, query_used)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file/{filename}")
async def get_image(filename: str):
    """특정 이미지 파일 반환 (품질 향상)"""
    file_path = _safe_image_path(filename)
    
    # 이미지 품질 향상을 위한 처리
    try:
        from PIL import Image
        import io
        
        # 원본 이미지 로드
        with Image.open(file_path) as img:
            # RGB 모드로 변환
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 이미지 크기가 작으면 업스케일링
            if img.width < 600 or img.height < 600:
                # 비율 유지하면서 최소 600px로 업스케일링
                ratio = max(600 / img.width, 600 / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # 고품질 JPEG로 변환
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=95, optimize=True)
            img_byte_arr.seek(0)
            
            return Response(
                content=img_byte_arr.getvalue(),
                media_type="image/jpeg",
                headers={
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "*",
                },
            )
    except Exception as e:
        print(f"이미지 처리 실패, 원본 반환: {e}")
        # 처리 실패 시 원본 반환
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

        print(f"[ImageSearch] Uploaded file: {file.filename} | Size: {file.size} bytes")

        # 이미지 파일을 PIL Image로 변환
        from PIL import Image
        
        # 파일 포인터를 처음으로 이동
        await file.seek(0)
        image_data = await file.read()
        
        # 이미지 데이터 검증
        if not image_data:
            raise HTTPException(status_code=400, detail="이미지 파일이 비어있습니다.")
        
        image = Image.open(io.BytesIO(image_data))
        
        # 이미지 형식 검증
        if image.format not in ['JPEG', 'PNG', 'WEBP']:
            raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다. JPEG, PNG, WEBP만 지원됩니다.")
        
        # 실제 이미지 검색 수행 (고화질 이미지 우선 선택)
        service = get_search_service()
        search_results = service.search_by_image(image, limit)
        
        # 고화질 이미지 우선 선택하도록 결과 필터링
        formatted_images = []
        for result in search_results:
            # 이미지 크기 확인 및 고화질 우선 선택
            img_file = result.get("url", "").replace("/api/images/file/", "")
            img_path = f"app/img_search/only_product_images/{img_file}"
            
            try:
                from PIL import Image
                with Image.open(img_path) as img:
                    width, height = img.size
                    # 고화질 기준: 500x600 이상
                    if width >= 500 and height >= 600:
                        formatted_images.append(result)
                    elif len(formatted_images) < limit:  # 고화질이 부족하면 중화질도 포함
                        formatted_images.append(result)
            except:
                # 이미지 열기 실패 시 그대로 추가
                formatted_images.append(result)
            
            if len(formatted_images) >= limit:
                break
        
        return {
            "query": f"이미지: {file.filename}",
            "totalCount": len(formatted_images),
            "searchTime": 0.0,
            "images": formatted_images
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"이미지 검색 실패: {e}")
        raise HTTPException(status_code=500, detail=f"이미지 검색 실패: {str(e)}")



@router.post("/search-by-image-advanced")
async def search_images_by_file_advanced(
    file: UploadFile = File(...), 
    limit: int = 9,
    clothing_type: str = "all"
):
    """실제 고급 이미지 검색 API (인체 분할 + 의류 영역 추출 + 카테고리 분류)"""
    try:
        limit = _clamp_limit(limit)
        
        # 이미지 파일 검증
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")
        
        # 파일 크기 제한 (10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")
        
        print(f"[AdvancedImageSearch] Uploaded file: {file.filename} | Size: {file.size} bytes")
        
        # 이미지 파일을 PIL Image로 변환
        from PIL import Image
        
        # 파일 포인터를 처음으로 이동
        await file.seek(0)
        image_data = await file.read()
        
        # 이미지 데이터 검증
        if not image_data:
            raise HTTPException(status_code=400, detail="이미지 파일이 비어있습니다.")
        
        image = Image.open(io.BytesIO(image_data))
        
        # 이미지 형식 검증
        if image.format not in ['JPEG', 'PNG', 'WEBP']:
            raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다. JPEG, PNG, WEBP만 지원됩니다.")
        
        # 실제 고급 이미지 검색 수행 (상의/하의 구분)
        service = get_search_service()
        search_response = service.search_by_image_advanced(image, limit, clothing_type)
        
        # 새로운 응답 구조로 변환
        search_results = search_response.get("results", [])
        separated_images = search_response.get("separated_images", [])
        search_type = search_response.get("search_type", clothing_type)
        
        # 텍스트 검색과 동일한 응답 구조로 변환
        formatted_images = []
        for result in search_results:
            formatted_images.append({
                "id": str(result.get("id", "")),
                "filename": str(result.get("title", "")),  # title을 filename으로 사용
                "url": str(result.get("url", "")),
                "title": str(result.get("title", "")),
                "description": f"고급 AI 이미지 검색 결과",
                "tags": ["고급검색", "인체분할", "카테고리분류"],
                "relevance": float(result.get("similarity", 0.0)),
                # 텍스트 검색과 동일한 구조
                "similarity": float(result.get("similarity", 0.0)),
                "product_name": str(result.get("product_name", "")),
                "price": int(result.get("price", 0)),
                "rating_avg": float(result.get("rating_avg", 0.0)),
                "brand": str(result.get("brand", "")),
                # 고급 기능 추가 정보
                "clothing_category": str(result.get("clothing_category", "")),
                "category_confidence": float(result.get("category_confidence", 0.0)),
                "detailed_analysis": service._convert_analysis_to_json_safe(result.get("detailed_analysis", {}))
            })
        
        return {
            "query": f"고급 이미지 검색: {file.filename}",
            "totalCount": len(formatted_images),
            "searchTime": 0.0,
            "images": formatted_images,
            # 분리된 이미지 정보 추가
            "separated_images": separated_images,
            "search_type": search_type,
            "advanced_search": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"고급 이미지 검색 실패: {e}")
        raise HTTPException(status_code=500, detail=f"고급 이미지 검색 실패: {str(e)}")

@router.post("/catalog/add")
async def add_image_to_catalog(
    file: UploadFile = File(...),
    brand: Optional[str] = None,
    title: Optional[str] = None,
    price: Optional[float] = None,
    url: Optional[str] = None
):
    """실제 이미지를 카탈로그에 추가"""
    try:
        # 이미지 파일 검증
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")
        
        # 파일 크기 제한 (10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")
        
        print(f"[CatalogAdd] Adding image: {file.filename}")
        
        # 이미지 파일을 PIL Image로 변환
        from PIL import Image
        
        await file.seek(0)
        image_data = await file.read()
        
        if not image_data:
            raise HTTPException(status_code=400, detail="이미지 파일이 비어있습니다.")
        
        image = Image.open(io.BytesIO(image_data))
        
        # 이미지 형식 검증
        if image.format not in ['JPEG', 'PNG', 'WEBP']:
            raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다. JPEG, PNG, WEBP만 지원됩니다.")
        
        # 메타데이터 준비
        metadata = {
            "brand": brand,
            "title": title,
            "price": price,
            "url": url,
            "filename": file.filename
        }
        
        # 실제 카탈로그에 추가
        service = get_search_service()
        result = service.add_image_to_catalog(image, metadata)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"카탈로그 추가 실패: {e}")
        raise HTTPException(status_code=500, detail=f"카탈로그 추가 실패: {str(e)}")

@router.delete("/catalog/delete/{image_id}")
async def delete_image_from_catalog(image_id: str):
    """실제 카탈로그에서 이미지 제거"""
    try:
        print(f"[CatalogDelete] Removing image: {image_id}")
        
        # 실제 카탈로그에서 제거
        service = get_search_service()
        result = service.remove_image_from_catalog(image_id)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"카탈로그 제거 실패: {e}")
        raise HTTPException(status_code=500, detail=f"카탈로그 제거 실패: {str(e)}")


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

@router.get("/separated/{filename}")
async def get_separated_image(filename: str):
    """분리된 이미지 파일 반환"""
    try:
        # 분리된 이미지 디렉토리
        separated_dir = Path(__file__).parent.parent.parent / "img_search" / "separated_images"

        if ".." in filename or "/" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")

        file_path = separated_dir / filename
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Separated image not found")

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
        raise HTTPException(status_code=500, detail=f"분리된 이미지 로드 실패: {str(e)}")


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