from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from app.db.mongodb import results_collection
from bson import ObjectId

router = APIRouter()

@router.get("/list")
async def list_results(userId: str, limit: int = 20):
    cursor = results_collection.find({"userId": userId}).sort("createdAt", -1).limit(limit)
    data: List[Dict[str, Any]] = [doc async for doc in cursor]
    # ObjectId 등 직렬화는 프런트에서 필요 시 처리 or 여기서 str 변환
    for d in data:
        if "_id" in d:
            d["_id"] = str(d["_id"])
    return {"status":"ok", "count": len(data), "items": data}

@router.get("/{result_id}")
async def get_result_by_id(result_id: str, userId: str = Query(...)):
    """특정 분석 결과 조회"""
    try:
        # ObjectId로 변환 시도
        try:
            object_id = ObjectId(result_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid result ID format")
        
        # 해당 사용자의 결과 조회
        result = await results_collection.find_one({
            "_id": object_id,
            "userId": userId
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found or access denied")
        
        # ObjectId를 문자열로 변환
        result["_id"] = str(result["_id"])
        
        return {"status": "ok", "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get result: {str(e)}")

@router.delete("/{result_id}")
async def delete_result(result_id: str, userId: str = Query(...)):
    """분석 결과 삭제"""
    try:
        # ObjectId로 변환 시도
        try:
            object_id = ObjectId(result_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid result ID format")
        
        # 해당 사용자의 결과인지 확인하고 삭제
        result = await results_collection.find_one_and_delete({
            "_id": object_id,
            "userId": userId
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found or access denied")
        
        return {"status": "ok", "message": "Result deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete result: {str(e)}")
