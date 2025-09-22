import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# 라우터 임포트
from routes.image_search import router as image_search_router
from routes.photo_search import router as photo_search_router

app = FastAPI(
    title="Image Search API",
    description="AI 기반 이미지 검색 시스템",
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
app.include_router(image_search_router, prefix="/api/images", tags=["Image Search"])
app.include_router(photo_search_router, tags=["Photo Search"])

# 정적 파일 서빙 (이미지 파일들)
images_dir = Path(__file__).parent / "data" / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

@app.get("/")
async def root():
    return {
        "message": "Image Search API",
        "version": "1.0.0",
        "endpoints": {
            "text_search": "/api/images/search",
            "image_list": "/api/images/list",
            "photo_search": "/search",
            "catalog_add": "/catalog/add"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

