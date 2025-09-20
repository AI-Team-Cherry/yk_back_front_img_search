from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
import requests, os

router = APIRouter(prefix="/llm-analysis", tags=["LLMAnalysis"])

# Colab ngrok 주소 (환경변수로 관리 - ngrok 주소는 재시작시마다 변경됨)
COLAB_BASE_URL = os.getenv("COLAB_BASE_URL", "")
COLAB_LLM_API = f"{COLAB_BASE_URL}/analyze" if COLAB_BASE_URL else "https://your-ngrok-address.ngrok-free.app/analyze"

@router.post("/analyze")
def analyze(payload: dict = Body(...)):
    question = payload.get("query")
    collections = payload.get("collections", [])  # 컬렉션 리스트 받기

    print(f"[LLM] Received request - Query: {question[:50]}{'...' if len(question) > 50 else ''}")
    print(f"[LLM] Selected collections: {collections}")

    if not question:
        return JSONResponse({"status": "error", "message": "query is required"}, status_code=400)

    # 컬렉션 선택 확인 (경고만 출력, 실행은 계속)
    if not collections:
        print("[LLM] WARNING: No collections selected, analysis will use default collection")

    # 입력 길이 제한 (보안)
    if len(question) > 2000:
        return JSONResponse({"status": "error", "message": "Query too long (max 2000 characters)"}, status_code=400)

    try:
        # COLAB_BASE_URL 확인
        print(f"[LLM] COLAB_BASE_URL: {COLAB_BASE_URL}")
        print(f"[LLM] COLAB_LLM_API: {COLAB_LLM_API}")

        if not COLAB_BASE_URL:
            print("[LLM] ERROR: COLAB_BASE_URL is not set!")
            return JSONResponse({"status": "error", "message": "COLAB_BASE_URL not configured"}, status_code=503)

        # 안전한 요청 헤더 추가
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Musinsa-AI-Backend/1.0"
        }

        # 페이로드에 컬렉션 정보 추가
        request_payload = {"query": question}
        if collections:
            request_payload["collections"] = collections

        print(f"[LLM] Sending request to: {COLAB_LLM_API}")
        print(f"[LLM] Payload: {request_payload}")

        res = requests.post(
            COLAB_LLM_API,
            json=request_payload,
            timeout=120,  # 타임아웃 연장 (Colab 응답 시간 고려)
            headers=headers
        )

        # 로깅 개선 (민감정보 제외)
        print(f"[LLM] Request sent, status: {res.status_code}")
        if res.status_code != 200:
            print(f"[LLM] Response text: {res.text}")

        if res.status_code == 200:
            return JSONResponse(res.json(), status_code=res.status_code)
        else:
            return JSONResponse({"status": "error", "message": f"External service error: {res.status_code}"}, status_code=502)

    except requests.exceptions.Timeout:
        return JSONResponse({"status": "error", "message": "Request timeout"}, status_code=504)
    except Exception as e:
        print(f"[ERROR] LLM request error: {type(e).__name__}")
        return JSONResponse({"status": "error", "message": "Internal server error"}, status_code=500)
