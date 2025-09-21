# app/api/routes/boards.py
from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import JSONResponse
from app.db.mongodb import db
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.models.board_reply import BoardReply
from app.services.embedding_service import get_embedding
import httpx
import os

router = APIRouter(prefix="/boards", tags=["Boards"])

SELF_BASE_URL = os.getenv("SELF_BASE_URL", "http://localhost:8000")

async def resolve_user(request: Request):
    """
    1) 미들웨어가 넣어준 request.state.user 우선
    2) 없으면 Authorization 헤더로 /auth/me 호출해 유저정보 조회 (폴백)
    """
    user = getattr(request.state, "user", None)
    if user:
        print("🔐 [resolve_user] request.state.user 사용:", user)
        return user

    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    print("🔐 [resolve_user] Authorization 헤더:", auth)

    if not auth:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{SELF_BASE_URL}/auth/me", headers={"Authorization": auth})
            print("🔐 [/auth/me] status:", r.status_code, "body:", r.text[:300])
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        print("❌ [resolve_user] /auth/me 호출 실패:", e)
    return None


@router.post("/{department}")
async def create_post(department: str, payload: dict = Body(...), request: Request = None):
    print("📝 [create_post] department:", department, "payload:", payload)
    print("📝 [create_post] headers.Authorization:", request.headers.get("Authorization"))

    user = await resolve_user(request)
    if not user:
        print("🛑 [create_post] user 없음 → 401")
        raise HTTPException(status_code=401, detail="Unauthorized")

    post_doc = {
        "department": department,
        "title": payload.get("title", "").strip(),
        "content": payload.get("content", "").strip(),
        "authorId": user.get("employeeId"),
        "authorName": user.get("name"),
        "created_at": datetime.utcnow(),
        "replies": []
    }
    print("📝 [create_post] insert doc:", post_doc)

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
        print("⚠️ [create_post] vector 저장 경고:", e)

    return {"status": "success", "id": inserted_id}


@router.get("/{department}")
async def list_posts(department: str):
    print("📥 [list_posts] department:", department)
    posts = await db.boards.find({"department": department}).to_list(length=None)
    for p in posts:
        p["_id"] = str(p["_id"])
    print("📤 [list_posts] count:", len(posts))
    return posts


@router.post("/{post_id}/reply")
async def add_reply(post_id: str, payload: dict = Body(...), request: Request = None):
    print("💬 [add_reply] post_id:", post_id, "payload:", payload)
    user = await resolve_user(request)
    if not user:
        print("🛑 [add_reply] user 없음 → 401")
        raise HTTPException(status_code=401, detail="Unauthorized")

    reply = {
        "authorId": user.get("employeeId"),
        "authorName": user.get("name"),
        "content": payload.get("content", "").strip(),
        "created_at": datetime.utcnow(),
    }

    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    result = await db.boards.update_one({"_id": obj_id}, {"$push": {"replies": reply}})
    print("💬 [add_reply] modified_count:", result.modified_count)
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
        print("⚠️ [add_reply] reply vector 저장 경고:", e)

    return {"status": "success"}


@router.delete("/{post_id}")
async def delete_post(post_id: str, request: Request = None):
    print("🗑️ [delete_post] post_id:", post_id)
    user = await resolve_user(request)
    if not user:
        print("🛑 [delete_post] user 없음 → 401")
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = await db.boards.find_one({"_id": obj_id})
    print("🗑️ [delete_post] post found:", bool(post))
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    print("🗑️ [delete_post] authorId=", post.get("authorId"), " current=", user.get("employeeId"))
    if post.get("authorId") != user.get("employeeId"):
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    result = await db.boards.delete_one({"_id": obj_id})
    print("🗑️ [delete_post] deleted_count:", result.deleted_count)
    return {"status": "success"}


@router.delete("/{post_id}/reply/{idx}")
async def delete_reply(post_id: str, idx: int, request: Request = None):
    print("🗑️ [delete_reply] post_id:", post_id, "idx:", idx)
    user = await resolve_user(request)
    if not user:
        print("🛑 [delete_reply] user 없음 → 401")
        raise HTTPException(status_code=401, detail="Unauthorized")

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
    print("🗑️ [delete_reply] target.authorId=", target.get("authorId"), " current=", user.get("employeeId"))
    if target.get("authorId") != user.get("employeeId"):
        raise HTTPException(status_code=403, detail="댓글 삭제 권한이 없습니다.")

    replies.pop(idx)
    await db.boards.update_one({"_id": obj_id}, {"$set": {"replies": replies}})
    return {"status": "success"}
