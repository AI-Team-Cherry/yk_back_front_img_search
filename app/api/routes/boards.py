# app/api/routes/boards.py
from fastapi import APIRouter, Body, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from app.db.mongodb import db
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.models.board_reply import BoardReply
from app.services.embedding_service import get_embedding
from app.api.routes.auth import get_current_user
import os

router = APIRouter(prefix="/boards", tags=["Boards"])

@router.post("/{department}")
async def create_post(department: str, payload: dict = Body(...), current_user = Depends(get_current_user)):
    print("[create_post] department:", department, "payload:", payload)
    print("[create_post] current_user:", current_user)

    post_doc = {
        "department": department,
        "title": payload.get("title", "").strip(),
        "content": payload.get("content", "").strip(),
        "authorId": current_user.get("employeeId"),
        "authorName": current_user.get("name"),
        "created_at": datetime.utcnow(),
        "replies": []
    }
    print("[create_post] insert doc:", post_doc)

    result = await db.boards.insert_one(post_doc)
    inserted_id = str(result.inserted_id)

    try:
        vector = get_embedding(f"{post_doc['title']} {post_doc['content']}")
        await db.board_vectors.insert_one({
            "post_id": inserted_id,
            "vector": vector,
            "department": department,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        print("[create_post] vector 저장 경고:", e)

    return {"status": "success", "id": inserted_id}


@router.get("/{department}")
async def list_posts(department: str):
    print("[list_posts] department:", department)
    try:
        posts = await db.boards.find({"department": department}).to_list(length=None)
        for p in posts:
            p["_id"] = str(p["_id"])
        print("[list_posts] count:", len(posts))
        return posts
    except Exception as e:
        print("[list_posts] error:", str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/{post_id}/reply")
async def add_reply(post_id: str, payload: dict = Body(...), current_user = Depends(get_current_user)):
    print("[add_reply] post_id:", post_id, "payload:", payload)

    reply = {
        "authorId": current_user.get("employeeId"),
        "authorName": current_user.get("name"),
        "content": payload.get("content", "").strip(),
        "created_at": datetime.utcnow(),
    }

    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    result = await db.boards.update_one({"_id": obj_id}, {"$push": {"replies": reply}})
    print("[add_reply] modified_count:", result.modified_count)
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")

    # replies 벡터 저장 (best-effort)
    try:
        post = await db.boards.find_one({"_id": obj_id})
        if post:
            vector = get_embedding(reply["content"])
            reply_doc = BoardReply(
                post_id=str(post["_id"]),
                department=post["department"],
                authorId=reply["authorId"],
                authorName=reply["authorName"],
                content=reply["content"],
                created_at=reply["created_at"],
                vector=vector,
            )
            await db.board_replies.insert_one(reply_doc.dict(by_alias=True))
    except Exception as e:
        print("[add_reply] reply vector 저장 경고:", e)

    return {"status": "success"}


@router.delete("/{post_id}")
async def delete_post(post_id: str, current_user = Depends(get_current_user)):
    print("[delete_post] post_id:", post_id)

    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = await db.boards.find_one({"_id": obj_id})
    print("[delete_post] post found:", bool(post))
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    print("[delete_post] authorId=", post.get("authorId"), " current=", current_user.get("employeeId"))
    if post.get("authorId") != current_user.get("employeeId"):
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    result = await db.boards.delete_one({"_id": obj_id})
    print("[delete_post] deleted_count:", result.deleted_count)
    return {"status": "success"}


@router.delete("/{post_id}/reply/{idx}")
async def delete_reply(post_id: str, idx: int, current_user = Depends(get_current_user)):
    print("[delete_reply] post_id:", post_id, "idx:", idx)

    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = await db.boards.find_one({"_id": obj_id})
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    replies = post.get("replies", [])
    if idx < 0 or idx >= len(replies):
        raise HTTPException(status_code=400, detail="잘못된 댓글 인덱스입니다.")

    target = replies[idx]
    print("[delete_reply] target.authorId=", target.get("authorId"), " current=", current_user.get("employeeId"))
    if target.get("authorId") != current_user.get("employeeId"):
        raise HTTPException(status_code=403, detail="댓글 삭제 권한이 없습니다.")

    replies.pop(idx)
    await db.boards.update_one({"_id": obj_id}, {"$set": {"replies": replies}})
    return {"status": "success"}
