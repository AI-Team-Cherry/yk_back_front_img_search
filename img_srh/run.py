#!/usr/bin/env python3
"""
이미지 검색 시스템 실행 스크립트
"""
import uvicorn
from main import app

if __name__ == "__main__":
    print("🚀 이미지 검색 시스템을 시작합니다...")
    print("📱 API 문서: http://localhost:8000/docs")
    print("🔍 텍스트 검색: http://localhost:8000/api/images/search")
    print("📸 이미지 검색: http://localhost:8000/search")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

