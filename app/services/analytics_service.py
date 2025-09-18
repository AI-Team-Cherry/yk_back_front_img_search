"""
분석 전담 서비스
MongoDB + 벡터 DB 기반 분석 기능을 제공
"""

from typing import Dict, Any, List
from app.services.mongodb_query_generator import to_pipeline
from app.db.mongodb import run_aggregation
from app.services.rag_service import search as rag_search

async def analyze_query(query: str) -> Dict[str, Any]:
    """
    사용자 자연어 질의를 받아 MongoDB 분석과 RAG 검색 결과를 반환
    """
    plan = to_pipeline(query)
    collection, pipeline = plan["collection"], plan["pipeline"]

    # MongoDB 실행
    mongo_results: List[Dict[str, Any]] = await run_aggregation(collection, pipeline)

    # RAG 검색
    rag_results = await rag_search(query)

    return {
        "mongo": {
            "collection": collection,
            "pipeline": pipeline,
            "results": mongo_results
        },
        "rag": rag_results
    }
