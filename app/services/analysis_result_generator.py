"""
최종 분석 결과 생성기
MongoDB + RAG 결과를 통합하여 리포트/시각화용 데이터를 반환
"""

from typing import Dict, Any, List
from app.services.analysis_helpers import summarize_results

def generate_analysis_result(query: str, mongo_results: List[Dict[str, Any]], rag_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    summary = summarize_results(mongo_results)

    return {
        "query": query,
        "summary": summary,
        "mongo_results": mongo_results,
        "rag_results": rag_results,
        "insights": f"'{query}'에 대한 인사이트 (더미).",
        "recommendations": ["추천 1", "추천 2"]
    }
