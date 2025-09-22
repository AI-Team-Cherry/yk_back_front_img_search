from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse, StreamingResponse
import requests, os, io, base64, datetime
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
import vl_convert as vlc  # ✅ Vega-Lite 변환
from app.services.report_service import build_analysis_report
import io

router = APIRouter(prefix="/llm-analysis", tags=["LLMAnalysis"])


# ✅ Colab ngrok 주소 (환경변수로 관리 권장)
COLAB_BASE_URL = os.getenv("COLAB_BASE_URL")
COLAB_LLM_API = f"{COLAB_BASE_URL}/analyze"


# ========================
# 🔹 1. Colab 프록시 분석 API
# ========================
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
        res = requests.post(COLAB_LLM_API, json={"query": question,"collections": collections}, timeout=6000)

        print("=== [LLM 요청 질문] ===", question)
        print("=== [Colab 응답 상태] ===", res.status_code)

        try:
            colab_json = res.json()
        except Exception:
            return JSONResponse(
                {"status": "error", "message": f"Colab 응답 실패: {res.text}"},
                status_code=res.status_code
            )

        print("=== [Colab 응답 JSON] ===", colab_json)

        # ✅ Colab 응답에서 핵심 필드만 추출 & 정제
        refined = {
            "status": colab_json.get("status", "error"),
            "query": colab_json.get("query"),
            "answer": colab_json.get("ai_analysis", {}).get("answer", ""),
            "insights": colab_json.get("ai_analysis", {}).get("insights", ""),
            "recommendations": colab_json.get("ai_analysis", {}).get("recommendations", ""),
            "data_classes": colab_json.get("ai_analysis", {}).get("data_classes", {}),
            "statistics": colab_json.get("ai_analysis", {}).get("statistics", {}),
            "correlations": colab_json.get("ai_analysis", {}).get("correlations", {}),
            "nonlinear_patterns": colab_json.get("ai_analysis", {}).get("nonlinear_patterns", ""),
            "mongodb_results": colab_json.get("mongodb_results", {}),
            "vector_results": colab_json.get("vector_results", {}),
            "visualizations": colab_json.get("visualizations", []),
            "report": colab_json.get("report", {}),
        }

        return JSONResponse(refined, status_code=res.status_code)

    except Exception as e:
        print("❌ LLM 요청 에러:", str(e))
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


# ========================
# 🔹 2. PDF 리포트 생성 API
# ========================

@router.post("/report")
async def generate_report(result: dict):
    pdf_bytes = build_analysis_report(result)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=analysis_report.pdf"},
    )

