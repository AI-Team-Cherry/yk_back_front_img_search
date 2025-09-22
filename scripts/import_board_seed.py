# scripts/import_board_seed.py
import pandas as pd
import json
from pymongo import MongoClient
from app.services.embedding_service import get_embedding

# ✅ pymongo 동기 클라이언트 직접 연결
MONGO_URI="mongodb+srv://cherry:1234@panguin5225.m6oav.mongodb.net/?retryWrites=true&w=majority&appName=Panguin5225"
DB_NAME="musinsa_db"
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

csv_path = "scripts/board_seed_faq.csv"
df = pd.read_csv(csv_path)

inserted_count = 0
for _, row in df.iterrows():
    record = {
        "department": row["department"],
        "title": row["title"],
        "content": row["content"],
        "author": row["author"],
        "created_at": row["created_at"],
        "replies": json.loads(row["replies"].replace("'", '"'))
        if isinstance(row["replies"], str) else []
    }

    result = db.boards.insert_one(record)
    post_id = str(result.inserted_id)

    try:
        vector = get_embedding(f"{record['title']} {record['content']}")
        db.board_vectors.insert_one({
            "post_id": post_id,
            "vector": vector,
            "department": record["department"],
            "created_at": record["created_at"]
        })
    except Exception as e:
        print(f"❌ 임베딩 생성 실패 (post_id={post_id}):", e)

    inserted_count += 1

print(f"✅ {inserted_count}개 문서를 boards + board_vectors에 추가했습니다.")
