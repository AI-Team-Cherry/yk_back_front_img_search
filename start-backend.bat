@echo off
echo Starting AI Analytics Platform Backend...
echo.

REM 가상환경 활성화
call venv\Scripts\activate

REM 백엔드 서버 시작
echo Backend server starting on http://localhost:8080
echo API Documentation: http://localhost:8080/docs
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload