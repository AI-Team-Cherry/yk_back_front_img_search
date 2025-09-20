from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.db.mongodb import db
import requests, os
from datetime import datetime

router = APIRouter(prefix="/llm", tags=["LLMBoardChat"])

# Colab ngrok 주소 (환경변수에서 관리)
COLAB_BASE_URL = os.getenv("COLAB_BASE_URL")
COLAB_BOARD_API = f"{COLAB_BASE_URL}/board-chat"


def save_board_chat_log(question: str, answer: str, department: str = None):
    """
    MongoDB board_chats 컬렉션에 대화 로그 저장
    """
    try:
        db.board_chats.insert_one({
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
        return JSONResponse(
            {"status": "error", "message": "question is required"},
            status_code=400,
        )

    # 1️⃣ MongoDB에서 게시글 가져오기
    query = {}
    if department:
        query["department"] = department

    # ⚠️ Motor 같은 async driver가 아니라면 .to_list는 불필요 (보통 동기 코드)
    posts = await db.boards.find(query).sort("created_at", -1).limit(30).to_list(length=30)
    if not posts:
        return JSONResponse({"status": "ok", "answer": "관련 게시글이 없습니다."})

    context = "\n".join([f"{p.get('title')} - {p.get('content')}" for p in posts])

    # 2️⃣ Colab LLM 서버 호출
    try:
        res = requests.post(
            COLAB_BOARD_API,
            json={"query": question, "context": context, "department": department},
            timeout=600,
        )

        print("=== [BoardChat 질문] ===")
        print(question)
        print("=== [전송한 context 일부] ===")
        print(context[:300])
        print("=== [Colab 응답 상태] ===", res.status_code)

        # 🔹 Colab 응답을 표준화
        colab_data = res.json()
        answer = (
            colab_data.get("answer")
            or colab_data.get("result")
            or colab_data.get("output")
            or str(colab_data)
        )

        # 3️⃣ 로그 저장
        save_board_chat_log(question, answer, department)

        # 🔹 항상 동일한 구조로 반환
        return JSONResponse({"status": "ok", "answer": answer}, status_code=200)

    except Exception as e:
        print("❌ BoardChat LLM 요청 에러:", str(e))
        return JSONResponse(
            {"status": "error", "message": str(e)},
            status_code=500,
        )
