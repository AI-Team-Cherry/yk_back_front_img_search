# app/api/routes/analytics.py
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from app.db.mongodb import db
from app.api.routes.auth import get_current_user

router = APIRouter(tags=["Analytics"])

# Pydantic 모델 정의
class AnalysisCreate(BaseModel):
    query: str
    title: Optional[str] = None
    result: Dict[str, Any]
    tags: Optional[List[str]] = []
    description: Optional[str] = None

class AnalysisShare(BaseModel):
    analysis_id: str
    category: Optional[str] = "analysis"

class AnalysisResponse(BaseModel):
    id: str
    user_id: str
    query: str
    title: str
    result: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_shared: bool = False
    tags: List[str] = []
    description: Optional[str] = None

# =========================
# 1. KPI (총합 지표)
# =========================
@router.get("/kpis")
async def get_kpis() -> Dict[str, Any]:
    total_sales = await db.orders.aggregate([
        {"$group": {"_id": None, "sum": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    orders = await db.orders.count_documents({})
    customers = await db.orders.distinct("buyer_id")
    return {
        "totalSales": total_sales[0]["sum"] if total_sales else 0,
        "orders": orders,
        "customers": len(customers),
        "dod": "+0%"   # TODO: 전일 대비 증감률 계산
    }

# =========================
# 2. 브랜드별 매출
# =========================
@router.get("/sales-by-dept")
async def sales_by_brand(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None
) -> List[Dict[str, Any]]:
    match = {}
    if from_ or to:
        match["order_date"] = {}
        if from_:
            match["order_date"]["$gte"] = from_
        if to:
            match["order_date"]["$lte"] = to

    pipeline = []
    if match:
        pipeline.append({"$match": match})

    pipeline.extend([
        {"$group": {"_id": "$brand_name", "sales": {"$sum": "$total_amount"}}},
        {"$project": {"_id": 0, "department": "$_id", "sales": 1}},
        {"$sort": {"sales": -1}}
    ])

    docs = await db.orders.aggregate(pipeline).to_list(None)
    return docs

# =========================
# 3. 매출 추이 (일자별 합계)
# =========================
@router.get("/timeseries")
async def timeseries(
    metric: str = "sales",
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None
) -> List[Dict[str, Any]]:
    match = {}
    if from_ or to:
        match["order_date"] = {}
        if from_:
            match["order_date"]["$gte"] = from_
        if to:
            match["order_date"]["$lte"] = to

    pipeline = []
    if match:
        pipeline.append({"$match": match})

    if metric == "sales":
        pipeline.extend([
            {"$group": {"_id": "$order_date", "value": {"$sum": "$total_amount"}}},
            {"$project": {"_id": 0, "date": "$_id", "value": 1}},
            {"$sort": {"date": 1}}
        ])
    elif metric == "orders":
        pipeline.extend([
            {"$group": {"_id": "$order_date", "value": {"$sum": 1}}},
            {"$project": {"_id": 0, "date": "$_id", "value": 1}},
            {"$sort": {"date": 1}}
        ])

    docs = await db.orders.aggregate(pipeline).to_list(None)
    return docs

# =========================
# 4. 분석 결과 저장 및 관리
# =========================

def generate_analysis_title(query: str) -> str:
    """분석 쿼리에서 의미있는 제목 생성"""
    if not query or query.strip() == '':
        return '제목 없음'
    
    trimmed_query = query.strip()
    
    # 한국어 질문 패턴에 따른 제목 생성
    patterns = [
        (r'(.+?)에 대해|(.+?)에 관해|(.+?)에 대한', lambda m: m.group(1).replace('에 대해', '').replace('에 관해', '').replace('에 대한', '') + ' 분석'),
        (r'(.+?)를 분석|(.+?)를 조회|(.+?)를 검색', lambda m: m.group(1).replace('를 분석', '').replace('를 조회', '').replace('를 검색', '') + ' 분석'),
        (r'(.+?)의 (.+?)를|(.+?)의 (.+?)을', lambda m: m.group(1) + '의 ' + m.group(2).replace('를', '').replace('을', '') + ' 분석'),
        (r'(.+?)해줘|(.+?)주세요|(.+?)줘', lambda m: m.group(1).replace('해줘', '').replace('주세요', '').replace('줘', '') + ' 분석')
    ]
    
    import re
    for pattern, formatter in patterns:
        match = re.search(pattern, trimmed_query)
        if match:
            title = formatter(match)
            return title[:50] + '...' if len(title) > 50 else title
    
    # 패턴이 매칭되지 않으면 처음 30자만 사용
    return trimmed_query[:30] + '...' if len(trimmed_query) > 30 else trimmed_query

@router.post("/analyses", response_model=AnalysisResponse)
async def save_analysis(
    analysis: AnalysisCreate,
    current_user: dict = Depends(get_current_user)
):
    """분석 결과 저장"""
    try:
        # 제목이 없으면 자동 생성
        title = analysis.title or generate_analysis_title(analysis.query)
        
        analysis_doc = {
            "user_id": current_user["employeeId"],
            "query": analysis.query,
            "title": title,
            "result": analysis.result,
            "tags": analysis.tags or [],
            "description": analysis.description,
            "is_shared": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.analyses.insert_one(analysis_doc)
        analysis_doc["_id"] = result.inserted_id
        
        return AnalysisResponse(
            id=str(result.inserted_id),
            user_id=current_user["employeeId"],
            query=analysis.query,
            title=title,
            result=analysis.result,
            created_at=analysis_doc["created_at"],
            updated_at=analysis_doc["updated_at"],
            is_shared=False,
            tags=analysis.tags or [],
            description=analysis.description
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 저장 실패: {str(e)}")

@router.get("/analyses", response_model=List[AnalysisResponse])
async def get_my_analyses(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """내 분석 목록 조회"""
    try:
        cursor = db.analyses.find(
            {"user_id": current_user["employeeId"]}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        analyses = []
        async for doc in cursor:
            analyses.append(AnalysisResponse(
                id=str(doc["_id"]),
                user_id=doc["user_id"],
                query=doc["query"],
                title=doc["title"],
                result=doc["result"],
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
                is_shared=doc.get("is_shared", False),
                tags=doc.get("tags", []),
                description=doc.get("description")
            ))
        
        return analyses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 목록 조회 실패: {str(e)}")

@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """분석 상세 조회"""
    try:
        doc = await db.analyses.find_one({
            "_id": ObjectId(analysis_id),
            "user_id": current_user["employeeId"]
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="분석을 찾을 수 없습니다")
        
        return AnalysisResponse(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            query=doc["query"],
            title=doc["title"],
            result=doc["result"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            is_shared=doc.get("is_shared", False),
            tags=doc.get("tags", []),
            description=doc.get("description")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 조회 실패: {str(e)}")

@router.post("/analyses/{analysis_id}/share")
async def share_analysis(
    analysis_id: str,
    share_data: AnalysisShare,
    current_user: dict = Depends(get_current_user)
):
    """분석 공유"""
    try:
        # 분석이 존재하고 사용자 소유인지 확인
        analysis = await db.analyses.find_one({
            "_id": ObjectId(analysis_id),
            "user_id": current_user["employeeId"]
        })
        
        if not analysis:
            raise HTTPException(status_code=404, detail="분석을 찾을 수 없습니다")
        
        # 분석을 공유 상태로 변경
        await db.analyses.update_one(
            {"_id": ObjectId(analysis_id)},
            {
                "$set": {
                    "is_shared": True,
                    "shared_at": datetime.utcnow(),
                    "category": share_data.category,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "분석이 성공적으로 공유되었습니다", "analysis_id": analysis_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 공유 실패: {str(e)}")

@router.get("/shared")
async def get_shared_analyses_alias(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=100)
):
    """공유된 분석 목록 조회 (페이지네이션 지원)"""
    skip = (page - 1) * limit
    return await get_shared_analyses(category=None, search=None, limit=limit, skip=skip)

@router.get("/shared-analyses")
async def get_shared_analyses(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """공유된 분석 목록 조회"""
    try:
        match_filter = {"is_shared": True}
        
        if category:
            match_filter["category"] = category
        
        if search:
            match_filter["$or"] = [
                {"query": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": search, "$options": "i"}}
            ]
        
        # 공유된 분석과 사용자 정보를 조인
        pipeline = [
            {"$match": match_filter},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "employeeId",
                    "as": "user_info"
                }
            },
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "query": 1,
                    "title": 1,
                    "result": 1,
                    "created_at": 1,
                    "shared_at": 1,
                    "category": 1,
                    "tags": 1,
                    "user_info.employeeId": 1,
                    "user_info.name": 1,
                    "user_info.department": 1
                }
            },
            {"$sort": {"shared_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        cursor = db.analyses.aggregate(pipeline)
        shared_analyses = []
        
        async for doc in cursor:
            user_info = doc.get("user_info", {})
            shared_analyses.append({
                "id": str(doc["_id"]),
                "query": doc["query"],
                "title": doc["title"],
                "result": doc["result"],
                "created_at": doc["created_at"],
                "shared_at": doc.get("shared_at"),
                "category": doc.get("category", "analysis"),
                "tags": doc.get("tags", []),
                "shared_by": {
                    "employeeId": user_info.get("employeeId", "알 수 없음"),
                    "name": user_info.get("name", "알 수 없음"),
                    "department": user_info.get("department", "알 수 없음")
                },
                "usage_count": 0,  # TODO: 실제 사용 통계
                "rating": 5.0      # TODO: 실제 평점 시스템
            })
        
        return {
            "analyses": shared_analyses,
            "total": len(shared_analyses)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공유 분석 조회 실패: {str(e)}")

@router.delete("/analyses/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """분석 삭제"""
    try:
        result = await db.analyses.delete_one({
            "_id": ObjectId(analysis_id),
            "user_id": current_user["employeeId"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="분석을 찾을 수 없습니다")
        
        return {"message": "분석이 성공적으로 삭제되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 삭제 실패: {str(e)}")
