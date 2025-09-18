from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
import requests, os

router = APIRouter(prefix="/llm-analysis", tags=["LLMAnalysis"])

# Colab ngrok 주소 (환경변수로 관리 권장)
COLAB_LLM_API = os.getenv("COLAB_LLM_API", "https://34f46d83fce9.ngrok-free.app/analyze")

@router.post("/analyze")
def analyze(payload: dict = Body(...)):
    question = payload.get("query")
    if not question:
        return JSONResponse({"status":"error","message":"query is required"}, status_code=400)

    try:
        res = requests.post(COLAB_LLM_API, json={"query": question}, timeout=600)
        return JSONResponse(res.json(), status_code=res.status_code)
    except Exception as e:
        return JSONResponse({"status":"error","message":str(e)}, status_code=500)