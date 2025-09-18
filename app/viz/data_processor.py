"""
데이터 전처리: MongoDB 결과를 차트-friendly 데이터로 변환
"""

from typing import List, Dict, Any

def normalize_data(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    MongoDB aggregation 결과를 차트 입력 데이터로 정규화
    """
    if not results:
        return []

    normalized = []
    for i, row in enumerate(results):
        entry = {}
        for k, v in row.items():
            if isinstance(v, (int, float, str)):
                entry[k] = v
            else:
                entry[k] = str(v)
        if not entry:
            entry["idx"] = i
        normalized.append(entry)
    return normalized
