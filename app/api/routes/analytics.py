# app/api/routes/analytics.py
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from app.db.mongodb import db
from app.api.routes.auth import get_current_user
import random

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
    """사용자 질문을 그대로 제목으로 사용"""
    if not query or query.strip() == '':
        return '데이터 탐색 분석'

    trimmed_query = query.strip()

    # 사용자 질문을 그대로 제목으로 사용 (50자 제한)
    return trimmed_query[:50] + '...' if len(trimmed_query) > 50 else trimmed_query

def generate_realistic_rating() -> float:
    """초기 평점을 0.0으로 설정 (다른 사용자들이 평점을 줄 수 있도록)"""
    return 0.0

@router.post("/analyses", response_model=AnalysisResponse)
async def save_analysis(
    analysis: AnalysisCreate,
    current_user: dict = Depends(get_current_user)
):
    """분석 결과 저장"""
    try:
        # 제목이 없으면 쿼리 그대로 사용
        title = analysis.title or analysis.query or '데이터 탐색 분석'
        
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
                    "rating": generate_realistic_rating(),  # 공유 시점에 현실적인 평점 생성
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
                    "rating": 1,  # 기존 평점을 가져오거나
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
            # 저장된 평점이 있으면 사용하고, 없으면 현실적인 평점 생성
            rating = doc.get("rating", generate_realistic_rating())

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
                "usage_count": random.randint(0, 25),  # 현실적인 사용 횟수 (0~25회)
                "rating": rating
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

# =========================
# 5. 분석 결과 직접 공유 (DataAnalyticsDashboard용)
# =========================

class SharedAnalysisCreate(BaseModel):
    title: str
    query: str
    mongodb_query: Optional[str] = None
    columns: Optional[List[str]] = []
    sample_data: Optional[List[Dict[str, Any]]] = []
    csv_data: Optional[str] = None
    total_count: Optional[int] = 0
    chart_options: Optional[Dict[str, Any]] = {}
    created_by: str
    created_at: str
    collections: Optional[List[str]] = []

@router.post("/shared-analysis")
async def create_shared_analysis(
    share_data: SharedAnalysisCreate,
    current_user: dict = Depends(get_current_user)
):
    """데이터 분석 결과 직접 공유 (DataAnalyticsDashboard용)"""
    try:
        # 분석 결과 구조화
        analysis_result = {
            "query": share_data.query,
            "mongodb_query": share_data.mongodb_query,
            "columns": share_data.columns,
            "sample_data": share_data.sample_data,
            "csv_data": share_data.csv_data,
            "total_count": share_data.total_count,
            "chart_options": share_data.chart_options,
            "collections": share_data.collections
        }

        # 제목은 쿼리 내용을 그대로 사용
        title = share_data.query or share_data.title or '데이터 탐색 분석'

        # 분석을 먼저 저장
        analysis_doc = {
            "user_id": current_user["employeeId"],
            "query": share_data.query,
            "title": title,
            "result": analysis_result,
            "tags": [],
            "description": f"데이터 분석 대시보드에서 공유됨 - {', '.join(share_data.collections or [])}",
            "is_shared": True,  # 즉시 공유 상태로 설정
            "shared_at": datetime.utcnow(),
            "category": "dashboard_analysis",
            "rating": generate_realistic_rating(),  # 현실적인 평점 생성
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db.analyses.insert_one(analysis_doc)
        analysis_id = str(result.inserted_id)

        return {
            "message": "분석 결과가 성공적으로 공유되었습니다",
            "analysis_id": analysis_id,
            "share_url": f"/shared/{analysis_id}",
            "title": title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 결과 공유 실패: {str(e)}")
