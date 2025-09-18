"""
분석 헬퍼 함수 모음
"""

from typing import List, Dict, Any

def summarize_results(results: List[Dict[str, Any]]) -> str:
    if not results:
        return "결과가 없습니다."
    return f"{len(results)}건의 결과가 검색되었습니다."

def extract_top_k(results: List[Dict[str, Any]], key: str, k: int = 5) -> List[Dict[str, Any]]:
    return sorted(results, key=lambda x: x.get(key, 0), reverse=True)[:k]
