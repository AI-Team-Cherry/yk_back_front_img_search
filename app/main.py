from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, ingest, query, result, debug, analytics, report_generator, visualization, integrated_system, images , llm_analysis, boards, llm_board_chat, collections
from app.services.ai_model_service import ai_model_service

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Musinsa AI Backend",
    description="Musinsa AI 서비스용 백엔드 API",
    version="1.0.0"
)

# CORS 설정 (개발 환경용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서 모든 오리진 허용
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(ingest.router)
app.include_router(query.router, prefix="/query", tags=["Query"])
app.include_router(result.router, prefix="/result", tags=["Result"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# 공유 분석 API를 위한 추가 라우팅 (DataAnalyticsDashboard 호환성용)
app.include_router(analytics.router, prefix="/api", tags=["Shared Analytics"])
app.include_router(report_generator.router)
app.include_router(visualization.router, prefix="/api/visualization", tags=["Visualization"])
app.include_router(integrated_system.router)
app.include_router(debug.router)
app.include_router(images.router, prefix="/api/images", tags=["Images"])
app.include_router(llm_analysis.router)
app.include_router(boards.router)
app.include_router(llm_board_chat.router)
app.include_router(collections.router, prefix="/api", tags=["Collections"])

# Health check 엔드포인트
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/")
async def root():
    return {"message": "Musinsa AI Backend API", "status": "running"}

# 모든 요청을 로깅하는 미들웨어
@app.middleware("http")
async def log_requests(request, call_next):
    if "/api/images/compose-fashion" in str(request.url):
        print(f"[MIDDLEWARE] 요청 감지: {request.method} {request.url}")
        print(f"[MIDDLEWARE] Headers: {dict(request.headers)}")
    response = await call_next(request)
    if "/api/images/compose-fashion" in str(request.url):
        print(f"[MIDDLEWARE] 응답: {response.status_code}")
    return response



@app.on_event("startup")
async def startup_event():
    ai_model_service.load_models()
