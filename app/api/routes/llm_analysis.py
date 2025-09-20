from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
import requests, os

router = APIRouter(prefix="/llm-analysis", tags=["LLMAnalysis"])

# Colab ngrok 주소 (환경변수로 관리 권장)
COLAB_BASE_URL = os.getenv("COLAB_BASE_URL")
COLAB_LLM_API = f"{COLAB_BASE_URL}/analyze"

@router.post("/analyze")
def analyze(payload: dict = Body(...)):
    question = payload.get("query")
    if not question:
        return JSONResponse({"status": "error", "message": "query is required"}, status_code=400)

    try:
        res = requests.post(COLAB_LLM_API, json={"query": question}, timeout=6000)
        
        # ✅ 응답 내용 로그로 확인
        print("=== [LLM 요청 질문] ===")
        print(question)
        print("=== [Colab 응답 상태] ===")
        print(res.status_code)
        print("=== [Colab 응답 JSON] ===")
        try:
            print(res.json())
        except Exception:
            print(res.text)  # JSON 파싱 실패 시 원문 출력

        return JSONResponse(res.json(), status_code=res.status_code)
    except Exception as e:
        print("❌ LLM 요청 에러:", str(e))
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
