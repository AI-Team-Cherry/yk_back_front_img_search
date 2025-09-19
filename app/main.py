from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, ingest, query, result, debug, analytics, report_generator, visualization, integrated_system, images , llm_analysis
from app.services.ai_model_service import ai_model_service

app = FastAPI(
    title="Musinsa AI Backend",
    description="Musinsa AI 서비스용 백엔드 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(ingest.router)
app.include_router(query.router, prefix="/query", tags=["Query"])
app.include_router(result.router, prefix="/result", tags=["Result"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(report_generator.router)
app.include_router(visualization.router, prefix="/visualization", tags=["Visualization"])
app.include_router(integrated_system.router)
app.include_router(debug.router)
app.include_router(images.router, prefix="/api/images", tags=["Images"])
app.include_router(llm_analysis.router)

@app.on_event("startup")
async def startup_event():
    ai_model_service.load_models()
