"""
스키마 컨텍스트: MongoDB 컬렉션/필드 구조 설명
RAG나 쿼리 생성 시 힌트로 사용
"""

SCHEMA_CONTEXT = {
    "products": {
        "fields": ["product_id", "name", "brand", "category_l1", "gender", "price", "views_1m", "sales_cum", "hearts", "reviews_count", "rating_avg"]
    },
    "buyers": {
        "fields": ["buyer_id", "gender", "email", "phone", "address", "age", "age_group"]
    }
}
