"""
유틸리티 함수들
"""
import numpy as np
from typing import Any, Dict, List


def convert_analysis_to_json_safe(data: Any) -> Any:
    """numpy 타입을 JSON 직렬화 가능한 타입으로 변환"""
    if isinstance(data, dict):
        return {key: convert_analysis_to_json_safe(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_analysis_to_json_safe(item) for item in data]
    elif isinstance(data, np.integer):
        return int(data)
    elif isinstance(data, np.floating):
        return float(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    else:
        return data


def format_analysis_for_frontend(product_info: Dict[str, Any], similarity_score: float, 
                                analyzer) -> Dict[str, Any]:
    """프론트엔드가 기대하는 구조로 분석 결과 변환"""
    # 기존 분석 함수들 호출 (기존 로직 그대로)
    popularity_raw = analyzer.calculate_popularity_score(
        product_info.get("hearts", 0),
        product_info.get("views_1m", 0),
        product_info.get("reviews_count", 0)
    )
    price_raw = analyzer.analyze_price_segment(product_info.get("price", 0))
    quality_raw = analyzer.analyze_product_quality(
        product_info.get("rating_avg", 0.0),
        product_info.get("reviews_count", 0),
        product_info.get("price", 0)
    )
    trend_raw = analyzer.analyze_product_trend(
        product_info.get("hearts", 0),
        product_info.get("views_1m", 0),
        product_info.get("rating_avg", 0.0)
    )
    brand_raw = analyzer.analyze_brand_positioning(
        product_info.get("brand", ""),
        product_info.get("price", 0)
    )
    competitiveness_raw = analyzer.analyze_competitiveness(
        similarity_score,
        product_info.get("price", 0),
        product_info.get("rating_avg", 0.0)
    )
    overall_raw = analyzer.calculate_product_overall_rating(
        popularity_raw, price_raw, quality_raw, trend_raw
    )
    
    # 추천 이유 생성
    recommendation_reasons = analyzer.generate_recommendation_reasons(
        popularity_raw, price_raw, quality_raw, trend_raw
    )
    
    # 프론트엔드가 기대하는 구조로 변환
    return {
        "popularity": {
            "score": {
                "score": popularity_raw["score"],
                "level": popularity_raw["level"]
            },
            "hearts": product_info.get("hearts", 0),
            "views_1m": product_info.get("views_1m", 0),
            "reviews_count": product_info.get("reviews_count", 0)
        },
        "price_analysis": price_raw,
        "quality_indicators": quality_raw,
        "trend_status": trend_raw,
        "brand_analysis": brand_raw,
        "competitiveness": competitiveness_raw,
        "recommendation_reasons": recommendation_reasons,
        "overall_rating": overall_raw
    }
