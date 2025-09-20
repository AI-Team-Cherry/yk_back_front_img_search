from fastapi import APIRouter, HTTPException, Body
from app.db.mongodb import db
from app.models.board import BoardPost
from app.models.board_reply import BoardReply
from datetime import datetime
from bson import ObjectId
from app.services.embedding_service import get_embedding

router = APIRouter(prefix="/boards", tags=["Boards"])

@router.post("/{department}")
async def create_post(department: str, payload: dict = Body(...)):
    post = BoardPost(
        department=department,
        title=payload["title"],
        content=payload["content"],
        author=payload.get("author", "익명"),
    )
    result = db.boards.insert_one(post.dict(by_alias=True))
    post_id = str(result.inserted_id)

    # 🔹 게시글 임베딩 저장
    vector = get_embedding(f"{post.title} {post.content}")
    db.board_vectors.insert_one({
        "post_id": post_id,
        "vector": vector,
        "department": department,
        "created_at": datetime.utcnow()
    })

    return {"status": "success", "id": post_id}

@router.get("/{department}")
async def list_posts(department: str):
    posts = await db.boards.find({"department": department}).to_list(length=None)
    for p in posts:
        p["_id"] = str(p["_id"])
    return posts

@router.post("/{post_id}/reply")
async def add_reply(post_id: str, payload: dict = Body(...)):
    reply = {
        "author": payload.get("author", "익명"),
        "content": payload["content"],
        "created_at": datetime.utcnow(),
    }

    result = db.boards.update_one(
        {"_id": ObjectId(post_id)}, {"$push": {"replies": reply}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")

    # 🔹 board_replies 컬렉션에 독립 문서로 저장
    post = db.boards.find_one({"_id": ObjectId(post_id)})
    if post:
        vector = get_embedding(reply["content"])
        reply_doc = BoardReply(
            post_id=str(post["_id"]),
            department=post["department"],
            author=reply["author"],
            content=reply["content"],
            created_at=reply["created_at"],
            vector=vector,
        )
        db.board_replies.insert_one(reply_doc.dict(by_alias=True))

    return {"status": "success"}