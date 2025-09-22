from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse, StreamingResponse
import requests, os, io, csv, json, base64, datetime
from datetime import datetime
from app.db.mongodb import db
from bson import ObjectId
from app.services.report_service import generate_report

router = APIRouter(prefix="/llm-analysis", tags=["LLMAnalysis"])

# Colab ngrok 주소 (환경변수로 관리)
COLAB_BASE_URL = os.getenv("COLAB_BASE_URL", "")
COLAB_LLM_API = f"{COLAB_BASE_URL}/analyze" if COLAB_BASE_URL else ""
COLAB_QUERY_API = f"{COLAB_BASE_URL}/analyze" if COLAB_BASE_URL else ""

# ========================
# 헬퍼 함수들
# ========================

def fix_mongo_docs(docs):
    """MongoDB 결과에 있는 ObjectId를 문자열로 변환"""
    fixed = []
    for d in docs:
        try:
            d = dict(d)
            if "_id" in d and isinstance(d["_id"], ObjectId):
                d["_id"] = str(d["_id"])
            fixed.append(d)
        except Exception:
            fixed.append(str(d))
    return fixed

def execute_mongodb_query(collection_name: str, pipeline: list):
    """MongoDB 쿼리를 백엔드에서 직접 실행"""
    try:
        collection = db[collection_name]
        cursor = collection.aggregate(pipeline)
        results = list(cursor)
        results = fix_mongo_docs(results)
        return results
    except Exception as e:
        print(f"MongoDB 쿼리 실행 오류: {e}")
        return []

def convert_to_csv(data):
    """데이터를 CSV 문자열로 변환"""
    if not data:
        return ""

    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    return output.getvalue()

def suggest_chart_type_and_fields(data, question):
    """데이터와 질문을 분석해서 적절한 차트 타입과 필드 추천"""
    if not data:
        return {"type": "bar", "x_field": "", "y_field": "", "title": "데이터 없음"}

    # 첫 번째 레코드에서 필드 분석
    sample_row = data[0]

    # 숫자 필드와 텍스트 필드 구분
    numeric_fields = []
    text_fields = []

    for key, value in sample_row.items():
        if key == "_id":
            continue
        if isinstance(value, (int, float)) and key not in ['_id']:
            numeric_fields.append(key)
        else:
            text_fields.append(key)

    # 기본값 설정
    x_field = text_fields[0] if text_fields else "name"
    y_field = numeric_fields[0] if numeric_fields else "value"

    # 질문 분석을 통한 차트 타입 결정
    if "추이" in question or "변화" in question or "시간" in question:
        chart_type = "line"
        title = f"{y_field} 추이 분석"
    elif "비율" in question or "점유율" in question or "분포" in question:
        chart_type = "donut"
        title = f"{x_field}별 {y_field} 분포"
    else:
        chart_type = "bar"
        title = f"{x_field}별 {y_field} 비교"

    return {
        "type": chart_type,
        "x_field": x_field,
        "y_field": y_field,
        "title": title
    }

# ========================
# 새로운 아키텍처: 쿼리 생성 + 백엔드 실행
# ========================

@router.post("/analyze-v2")
def analyze_v2(payload: dict = Body(...)):
    """새로운 아키텍처: Colab에서 쿼리 생성, 백엔드에서 실행"""
    question = payload.get("query")
    collections = payload.get("collections", [])
    format_type = payload.get("format", "analytics")

    print(f"[LLM-V2] 질문: {question}")
    print(f"[LLM-V2] 컬렉션: {collections}")
    print(f"[LLM-V2] 형식: {format_type}")

    if not question:
        return JSONResponse({"status": "error", "message": "query is required"}, status_code=400)

    if len(question) > 2000:
        return JSONResponse({"status": "error", "message": "Query too long (max 2000 characters)"}, status_code=400)

    try:
        # Step 1: Colab에서 MongoDB 쿼리 생성
        if not COLAB_BASE_URL:
            return JSONResponse({"status": "error", "message": "COLAB_BASE_URL not configured"}, status_code=503)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Musinsa-AI-Backend/2.0"
        }

        query_payload = {
            "query": question,
            "collections": collections
        }

        print(f"[LLM-V2] Colab 쿼리 생성 요청: {COLAB_QUERY_API}")

        # Colab에서 쿼리만 생성 (타임아웃 단축)
        query_response = requests.post(
            COLAB_QUERY_API,
            json=query_payload,
            timeout=30,  # 쿼리 생성만 하므로 30초로 단축
            headers=headers
        )

        if query_response.status_code != 200:
            print(f"[LLM-V2] Colab 쿼리 생성 실패: {query_response.status_code}")
            return JSONResponse({"status": "error", "message": "Query generation failed"}, status_code=502)

        query_result = query_response.json()

        if query_result.get("status") != "success":
            return JSONResponse({"status": "error", "message": "Query generation failed"}, status_code=500)

        # 코랩 응답 형식 처리
        mongodb_results = query_result.get("mongodb_results", {})
        target_collection = mongodb_results.get("collection", "unknown")
        pipeline = mongodb_results.get("pipeline", [])
        raw_results = mongodb_results.get("data", [])

        print(f"[LLM-V2] 코랩에서 받은 데이터: {target_collection} / {len(raw_results)}건")

        # MongoDB 쿼리 문자열 생성 (시각화용)
        mongodb_query_str = f"db.{target_collection}.aggregate({pipeline})"

        # Step 3: Analytics 형식으로 응답 생성
        if format_type == "analytics":
            # 컬럼 추출
            columns = list(raw_results[0].keys()) if raw_results else []

            # 샘플 데이터 (상위 10개)
            sample_data = raw_results[:10] if raw_results else []

            # CSV 데이터 생성
            csv_data = convert_to_csv(raw_results)

            # 차트 추천
            chart_suggestion = suggest_chart_type_and_fields(raw_results, question)

            response = {
                "query": question,
                "mongodb_query": mongodb_query_str,
                "columns": columns,
                "sample_data": sample_data,
                "csv_data": csv_data,
                "total_count": len(raw_results),
                "chart_suggestion": chart_suggestion
            }
            return response

        # 기존 형식 (하위 호환성)
        return {
            "status": "success",
            "query": question,
            "mongodb_results": {
                "collection": target_collection,
                "pipeline": pipeline,
                "data": raw_results[:20] if raw_results else [],
                "summary": f"{len(raw_results)}건 결과 반환" if raw_results else "데이터가 부족하거나 없음"
            }
        }

    except requests.exceptions.Timeout:
        return JSONResponse({"status": "error", "message": "Query generation timeout"}, status_code=504)
    except Exception as e:
        print(f"[ERROR] LLM-V2 분석 오류: {str(e)}")
        return JSONResponse({"status": "error", "message": "Internal server error"}, status_code=500)

# ========================
# 코랩 URL 설정 확인 API
# ========================

@router.get("/colab-url")
def get_colab_url():
    """현재 설정된 코랩 URL 반환"""
    return {
        "colab_url": COLAB_BASE_URL,
        "is_configured": bool(COLAB_BASE_URL)
    }

# ========================
# 기존 Colab 프록시 분석 API
# ========================

@router.post("/analyze")
def analyze(payload: dict = Body(...)):
    question = payload.get("query")
    collections = payload.get("collections", [])  # 컬렉션 리스트 받기
    format_type = payload.get("format", "default")  # 응답 형식 지정

    print(f"[LLM] Received request - Query: {question[:50]}{'...' if len(question) > 50 else ''}")
    print(f"[LLM] Selected collections: {collections}")
    print(f"[LLM] Response format: {format_type}")

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

        # 페이로드에 컬렉션 정보 및 형식 추가
        request_payload = {"query": question}
        if collections:
            request_payload["collections"] = collections
        if format_type:
            request_payload["format"] = format_type

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
        else:
            return JSONResponse({"status": "error", "message": f"External service error: {res.status_code}"}, status_code=502)

    except requests.exceptions.Timeout:
        return JSONResponse({"status": "error", "message": "Request timeout"}, status_code=504)
    except Exception as e:
        print(f"[ERROR] LLM request error: {type(e).__name__}")
        return JSONResponse({"status": "error", "message": "Internal server error"}, status_code=500)

