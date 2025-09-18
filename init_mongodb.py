"""
MongoDB 초기화 스크립트
CSV 대신 MongoDB 직접 초기화 / 샘플 데이터 삽입
"""

import asyncio
from datetime import datetime
from app.db.mongodb import (
    products_collection,
    reviews_collection,
    buyers_collection,
)

async def reset_collections():
    await products_collection.delete_many({})
    await reviews_collection.delete_many({})
    await buyers_collection.delete_many({})

    print("모든 컬렉션 초기화 완료 ✅")

async def seed_sample_data():
    # products
    await products_collection.insert_many([
        {
            "product_id": "P001",
            "name": "뉴발란스 530",
            "brand": "뉴발란스",
            "category_l1": "신발",
            "gender": "공용",
            "price": 99000,
            "views_1m": 12000,
            "sales_cum": 4500,
            "hearts": 3200,
            "reviews_count": 200,
            "rating_avg": 4.5,
        },
        {
            "product_id": "P002",
            "name": "나이키 에어포스 1",
            "brand": "나이키",
            "category_l1": "신발",
            "gender": "공용",
            "price": 119000,
            "views_1m": 18000,
            "sales_cum": 7800,
            "hearts": 5400,
            "reviews_count": 410,
            "rating_avg": 4.7,
        }
    ])

    # buyers
    await buyers_collection.insert_one({
        "buyer_id": "B001",
        "gender": "M",
        "email": "test@example.com",
        "phone": "010-1234-5678",
        "address": "서울시 강남구",
        "age": 29,
        "age_group": "20대",
    })

    # reviews
    await reviews_collection.insert_one({
        "product_id": "P001",
        "user_id": "U001",
        "score": 5,
        "text": "편하고 좋아요",
        "전체감정예측": "긍정",
        "전체예측신뢰도": 0.95,
        "createdAt": datetime.utcnow(),
    })

    print("샘플 데이터 적재 완료 ✅")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(reset_collections())
    loop.run_until_complete(seed_sample_data())
