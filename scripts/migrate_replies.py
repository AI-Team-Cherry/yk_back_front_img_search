# scripts/migrate_replies.py
import os
import sys
from datetime import datetime
from pymongo import MongoClient

# ✅ .env 값 불러오기 (필요하면 python-dotenv 써도 됨)
MONGO_URI="mongodb+srv://cherry:1234@panguin5225.m6oav.mongodb.net/?retryWrites=true&w=majority&appName=Panguin5225"
MONGO_DB = "musinsa_db"

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

from app.services.embedding_service import get_embedding

def migrate_replies():
    posts = list(db.boards.find({}))
    migrated = 0

    for post in posts:
        post_id = str(post["_id"])
        dept = post.get("department", "UNKNOWN")
        replies = post.get("replies", [])

        for reply in replies:
            content = reply.get("content", "")
            if not content:
                continue

            vector = get_embedding(content)

            reply_doc = {
                "post_id": post_id,
                "department": dept,
                "author": reply.get("author", "익명"),
                "role": reply.get("role", "employee"),
                "content": content,
                "created_at": reply.get("created_at", datetime.utcnow()),
                "vector": vector,
            }

            db.board_replies.insert_one(reply_doc)
            migrated += 1

    print(f"✅ 마이그레이션 완료: {migrated}개의 답변을 board_replies로 이동했습니다.")

if __name__ == "__main__":
    migrate_replies()
