from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.db.mongodb import db
from datetime import datetime
import httpx, os
import torch
from sentence_transformers import SentenceTransformer, util

router = APIRouter(prefix="/llm", tags=["LLMBoardChat"])

COLAB_BASE_URL = os.getenv("COLAB_BASE_URL")
COLAB_BOARD_API = f"{COLAB_BASE_URL}/board-chat"

# 🔹 임베딩 모델 로딩 (ko-sroberta-multitask)
embedder = SentenceTransformer("jhgan/ko-sroberta-multitask")

async def save_board_chat_log(question: str, answer: str, department: str = None):
    try:
        await db.board_chats.insert_one({
            "question": question,
            "answer": answer,
            "department": department,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        print("❌ 로그 저장 실패:", e)

@router.post("/board-chat")
async def board_chat(payload: dict = Body(...)):
    question = payload.get("question")
    department = payload.get("department")

    if not question:
        return JSONResponse({"status": "error", "message": "question is required"}, status_code=400)

    # 1️⃣ 게시글 불러오기
    query = {}
    if department:
        query["department"] = department
    posts = await db.boards.find(query).to_list(length=200)  # 충분히 가져오기

    if not posts:
        return JSONResponse({"status": "ok", "answer": "관련 게시글이 없습니다."})

    # 2️⃣ 게시글+답변 문장화
    docs = []
    for p in posts:
        base = f"제목: {p.get('title')}\n질문: {p.get('content')}"
        replies = p.get("replies", [])
        if replies:
            base += f"\n답변: {replies[0].get('content')}"
        docs.append((str(p["_id"]), base, p.get("department")))

    # 3️⃣ 임베딩 기반 유사도 검색
    query_vec = embedder.encode(question, convert_to_tensor=True)
    doc_texts = [d[1] for d in docs]
    doc_vecs = embedder.encode(doc_texts, convert_to_tensor=True)

    cos_scores = util.cos_sim(query_vec, doc_vecs)[0]
    scored_docs = [(docs[i][0], docs[i][1], docs[i][2], float(cos_scores[i])) for i in range(len(docs))]

    # top-k 필터링
    scored_docs = sorted(scored_docs, key=lambda x: x[3], reverse=True)[:5]

    # 0.6 이하라면 관련 없음 처리
    if all(score < 0.6 for _, _, _, score in scored_docs):
        return JSONResponse({"status": "ok", "answer": "관련 답변이 없습니다."})

    # 4️⃣ context 생성
    context = "\n\n".join([doc[1] for doc in scored_docs])

    # 5️⃣ Colab 호출
    try:
        async with httpx.AsyncClient(timeout=600) as client:
            res = await client.post(
                COLAB_BOARD_API,
                json={"query": question, "context": context, "department": department},
            )
        colab_data = res.json()
        answer = colab_data.get("answer", "").strip()

        if not answer or len(answer) < 3:
            answer = "관련 답변이 없습니다."

        # 가장 관련있는 게시글 링크 (첫 번째 top-1)
        post_id, _, post_dept, _ = scored_docs[0]
        post_link = f"/boards/{post_dept}/{post_id}"

        await save_board_chat_log(question, answer, department)

        return JSONResponse({
            "status": "ok",
            "query": question,
            "department": department,
            "answer": answer,
            "postLink": post_link
        })

    except Exception as e:
        print("❌ BoardChat LLM 요청 에러:", str(e))
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
