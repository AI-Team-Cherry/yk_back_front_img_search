from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, ingest, query, result, debug, analytics, report_generator, visualization, integrated_system, images , llm_analysis, collections
from app.services.ai_model_service import ai_model_service

app = FastAPI(
    title="Musinsa AI Backend",
    description="Musinsa AI 서비스용 백엔드 API",
    version="1.0.0"
)

# CORS 설정 (개발 환경용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # 프론트엔드가 3001 포트에서 실행 중
        "http://127.0.0.1:3001"
    ],
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
app.include_router(report_generator.router)
app.include_router(visualization.router, prefix="/api/visualization", tags=["Visualization"])
app.include_router(integrated_system.router)
app.include_router(debug.router)
app.include_router(images.router, prefix="/api/images", tags=["Images"])
app.include_router(llm_analysis.router)
app.include_router(collections.router, prefix="/api", tags=["Collections"])

# Health check 엔드포인트
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/")
async def root():
    return {"message": "Musinsa AI Backend API", "status": "running"}

@app.on_event("startup")
async def startup_event():
    ai_model_service.load_models()
