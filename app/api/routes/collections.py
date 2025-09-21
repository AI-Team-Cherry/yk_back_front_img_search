from fastapi import APIRouter, Depends, HTTPException
from app.db.mongodb import db
from app.api.routes.auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/collections", response_model=List[str])
async def get_mongodb_collections(current_user=Depends(get_current_user)):
    """
    MongoDB에서 사용 가능한 컬렉션 목록을 반환합니다.
    """
    try:
        # MongoDB에서 모든 컬렉션 이름 가져오기
        collections = await db.list_collection_names()

        # 시스템 컬렉션 제외 (admin, config 등)
        filtered_collections = [
            col for col in collections
            if not col.startswith('system.') and not col.startswith('admin.')
        ]

        return sorted(filtered_collections)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"컬렉션 목록을 가져오는데 실패했습니다: {str(e)}")

@router.get("/collections/{collection_name}/info")
async def get_collection_info(collection_name: str, current_user=Depends(get_current_user)):
    """
    특정 컬렉션의 정보를 반환합니다.
    """
    try:
        collection = db[collection_name]

        # 컬렉션 존재 여부 확인
        collections = await db.list_collection_names()
        if collection_name not in collections:
            raise HTTPException(status_code=404, detail="컬렉션을 찾을 수 없습니다.")

        # 문서 수 카운트
        doc_count = await collection.count_documents({})

        # 샘플 문서 하나 가져오기 (스키마 파악용)
        sample_doc = await collection.find_one({})
        schema_fields = list(sample_doc.keys()) if sample_doc else []

        return {
            "name": collection_name,
            "documentCount": doc_count,
            "sampleFields": schema_fields
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"컬렉션 정보를 가져오는데 실패했습니다: {str(e)}")