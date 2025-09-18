from typing import Dict, List, Any
import datetime
import re

# ====== 헬퍼: 정규식 매칭 ======
def match_in_query(pattern: str, query: str) -> bool:
    return re.search(pattern, query) is not None


# ====== RULES ======

# ✅ 정렬
SORT_RULES = {
    r"잘\s*팔린": {"$sort": {"sales_cum": -1}},
    r"판매량\s*높": {"$sort": {"sales_cum": -1}},
    r"판매량\s*낮": {"$sort": {"sales_cum": 1}},
    r"인기": {"$sort": {"views_1m": -1}},
    r"조회수\s*많": {"$sort": {"views_1m": -1}},
    r"조회수\s*적": {"$sort": {"views_1m": 1}},
    r"평점\s*높": {"$sort": {"rating_avg": -1}},
    r"평점\s*낮": {"$sort": {"rating_avg": 1}},
    r"리뷰\s*좋": {"$sort": {"rating_avg": -1}},
    r"별점\s*높": {"$sort": {"rating_avg": -1}},
    r"비싼": {"$sort": {"price": -1}},
    r"싼": {"$sort": {"price": 1}},
    r"가격\s*높": {"$sort": {"price": -1}},
    r"가격\s*낮": {"$sort": {"price": 1}},
    r"(최근|최신)": {"$sort": {"createdAt": -1}},
    r"오래된": {"$sort": {"createdAt": 1}},
}

# ✅ 필터 (항상 $match로 감싸기)
MATCH_RULES = {
    r"남자": {"$match": {"gender": "M"}},
    r"여자": {"$match": {"gender": "F"}},
    r"유니섹스": {"$match": {"gender": "UNISEX"}},
    r"상의": {"$match": {"category_l1": {"$regex": "상의"}}},
    r"하의": {"$match": {"category_l1": {"$regex": "하의"}}},
    r"신발": {"$match": {"category_l1": {"$regex": "신발"}}},
    r"가방": {"$match": {"category_l1": {"$regex": "가방"}}},
    r"액세서리": {"$match": {"category_l1": {"$regex": "액세서리"}}},
}

# ✅ 개수 제한
LIMIT_RULES = {
    r"(상위\s*10|10개)": {"$limit": 10},
    r"(상위\s*8|8개)": {"$limit": 8},
    r"(상위\s*5|5개)": {"$limit": 5},
    r"(상위\s*3|3개)": {"$limit": 3},
}

# ✅ 집계
AGG_RULES = {
    r"평균\s*가격": {"$group": {"_id": None, "avg_price": {"$avg": "$price"}}},
    r"평균\s*평점": {"$group": {"_id": None, "avg_rating": {"$avg": "$rating_avg"}}},
    r"총\s*판매량": {"$group": {"_id": None, "total_sales": {"$sum": "$sales_cum"}}},
    r"총\s*리뷰": {"$group": {"_id": None, "total_reviews": {"$sum": "$reviews_count"}}},
    r"최고가": {"$group": {"_id": None, "max_price": {"$max": "$price"}}},
    r"최저가": {"$group": {"_id": None, "min_price": {"$min": "$price"}}},
}

# ✅ 기간 필터
DATE_RULES = {
    r"오늘": {
        "$match": {
            "createdAt": {
                "$gte": datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            }
        }
    },
    r"이번주": {
        "$match": {
            "createdAt": {"$gte": datetime.datetime.now() - datetime.timedelta(days=7)}
        }
    },
    r"이번달": {
        "$match": {"createdAt": {"$gte": datetime.datetime.now().replace(day=1)}}
    },
    r"올해": {
        "$match": {
            "createdAt": {
                "$gte": datetime.datetime(datetime.datetime.now().year, 1, 1)
            }
        }
    },
}


def generate_return_analysis_pipeline(query: str) -> Dict[str, Any]:
    """
    반품률 분석을 위한 파이프라인 생성
    현재 데이터에 반품 정보가 없으므로, 유사한 지표를 사용하여 분석
    """
    if "공통점" in query or "패턴" in query:
        # 낮은 평점이나 판매량이 적은 상품들의 공통점 분석 (반품률 대신)
        return {
            "collection": "product",
            "pipeline": [
                # 1. 문제가 있을 수 있는 상품들 필터링 (낮은 평점 또는 낮은 판매량)
                {
                    "$match": {
                        "$or": [
                            {"rating_avg": {"$lt": 4.0, "$gt": 0}},  # 평점이 4.0 미만
                            {"sales_cum": {"$lt": 100}}  # 판매량이 100개 미만
                        ]
                    }
                },
                # 2. 카테고리별 그룹핑하여 패턴 분석
                {
                    "$group": {
                        "_id": {
                            "category": "$category_l1",
                            "price_range": {
                                "$switch": {
                                    "branches": [
                                        {"case": {"$lt": ["$price", 50000]}, "then": "저가"},
                                        {"case": {"$lt": ["$price", 150000]}, "then": "중가"},
                                        {"case": {"$gte": ["$price", 150000]}, "then": "고가"}
                                    ],
                                    "default": "기타"
                                }
                            }
                        },
                        "count": {"$sum": 1},
                        "avg_rating": {"$avg": "$rating_avg"},
                        "avg_price": {"$avg": "$price"},
                        "avg_sales": {"$avg": "$sales_cum"},
                        "products": {
                            "$push": {
                                "name": "$name",
                                "brand": "$brand",
                                "price": "$price",
                                "rating": "$rating_avg",
                                "sales": "$sales_cum"
                            }
                        }
                    }
                },
                # 3. 문제 상품이 많은 카테고리 순으로 정렬
                {"$sort": {"count": -1}},
                # 4. 상위 10개 패턴만 반환
                {"$limit": 10}
            ]
        }
    else:
        # 일반적인 문제 상품 목록
        return {
            "collection": "product",
            "pipeline": [
                {
                    "$match": {
                        "$or": [
                            {"rating_avg": {"$lt": 4.0, "$gt": 0}},
                            {"sales_cum": {"$lt": 50}}
                        ]
                    }
                },
                {
                    "$project": {
                        "name": 1,
                        "brand": 1,
                        "category_l1": 1,
                        "price": 1,
                        "rating_avg": 1,
                        "sales_cum": 1,
                        "reviews_count": 1,
                        "problem_score": {
                            "$add": [
                                {"$cond": [{"$lt": ["$rating_avg", 3.0]}, 3, 0]},
                                {"$cond": [{"$lt": ["$rating_avg", 4.0]}, 1, 0]},
                                {"$cond": [{"$lt": ["$sales_cum", 10]}, 2, 0]}
                            ]
                        }
                    }
                },
                {"$sort": {"problem_score": -1, "rating_avg": 1}},
                {"$limit": 20}
            ]
        }

# ====== PIPELINE BUILDER ======
def to_pipeline(query: str, intent: str = "기타", complexity: str = "단순") -> Dict[str, Any]:
    target_collection = "product"

    # 반품률 분석 특별 처리
    if intent == "반품_분석" or any(k in query for k in ["반품률", "반품", "환불"]):
        return generate_return_analysis_pipeline(query)

    # 특수 케이스
    if "브랜드별 매출" in query:
        return {
            "collection": target_collection,
            "pipeline": [
                {"$group": {"_id": "$brand", "total_sales": {"$sum": "$sales_cum"}}},
                {"$sort": {"total_sales": -1}},
                {"$limit": 10},
            ],
        }

    if "월별 매출" in query:
        return {
            "collection": "orders",
            "pipeline": [
                {
                    "$group": {
                        "_id": {"$substr": ["$order_date", 0, 7]},
                        "monthly_sales": {"$sum": "$total_amount"},
                    }
                },
                {"$sort": {"_id": 1}},
            ],
        }

    if "고객 연령대" in query:
        return {
            "collection": "buyers",
            "pipeline": [
                {"$group": {"_id": "$age", "cnt": {"$sum": 1}}},
                {"$sort": {"_id": 1}},
            ],
        }

    # 룰 기반 처리
    pipeline: List[Dict[str, Any]] = []

    for rules in [MATCH_RULES, DATE_RULES, SORT_RULES, LIMIT_RULES, AGG_RULES]:
        for pattern, clause in rules.items():
            if match_in_query(pattern, query):
                pipeline.append(clause)

    # fallback
    if not pipeline:
        pipeline = [{"$limit": 5}]

    return {"collection": target_collection, "pipeline": pipeline}
