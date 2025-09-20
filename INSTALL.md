# 🚀 빠른 설치 가이드

이 가이드를 따라하면 5분 안에 AI Analytics Platform을 실행할 수 있습니다!

## ⚡ 빠른 시작 (Windows)

### 1. 사전 요구사항 확인

```bash
# Python 버전 확인 (3.8 이상)
python --version

# Node.js 버전 확인 (16.0 이상)
node --version

# Git 설치 확인
git --version
```

> 만약 위 프로그램들이 설치되지 않았다면, [상세 설치 가이드](#상세-설치-가이드)를 참고하세요.

### 2. 프로젝트 클론 및 설정

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/ai-analytics-platform.git
cd ai-analytics-platform

# 2. 백엔드 설정
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. 환경변수 설정
copy .env.example .env
# .env 파일을 열어서 MongoDB 설정을 수정하세요

# 4. 프론트엔드 설정
cd frontend
npm install
copy .env.example .env.development
cd ..
```

### 3. 실행

두 개의 터미널을 열어서 다음을 실행하세요:

**터미널 1 (백엔드):**
```bash
start-backend.bat
```

**터미널 2 (프론트엔드):**
```bash
start-frontend.bat
```

### 4. 접속

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8001
- API 문서: http://localhost:8001/docs

---

## 🔧 상세 설치 가이드

### Python 설치

1. [Python 공식 사이트](https://www.python.org/downloads/)에서 최신 버전 다운로드
2. 설치 시 **"Add Python to PATH"** 체크박스 반드시 선택
3. 설치 완료 후 터미널에서 `python --version` 확인

### Node.js 설치

1. [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전 다운로드
2. 기본 설정으로 설치
3. 설치 완료 후 터미널에서 `node --version` 확인

### Git 설치

1. [Git for Windows](https://git-scm.com/download/win) 다운로드
2. 기본 설정으로 설치
3. 설치 완료 후 터미널에서 `git --version` 확인

### MongoDB 설정

#### 옵션 1: MongoDB Atlas (권장)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 회원가입
2. 무료 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일에 `MONGO_URI` 설정

#### 옵션 2: 로컬 MongoDB

1. [MongoDB Community Edition](https://www.mongodb.com/try/download/community) 설치
2. MongoDB 서비스 시작
3. `.env` 파일에 `MONGO_URI=mongodb://localhost:27017/` 설정

---

## 🐛 문제 해결

### "python을 찾을 수 없습니다"

Python이 PATH에 추가되지 않았습니다:
1. Python을 다시 설치하고 "Add to PATH" 옵션 선택
2. 또는 환경변수를 수동으로 추가

### "node를 찾을 수 없습니다"

Node.js가 설치되지 않았습니다:
1. Node.js 공식 사이트에서 LTS 버전 설치

### 포트 충돌 오류

다른 프로그램이 포트를 사용 중입니다:
```bash
# 포트 사용 확인
netstat -ano | findstr :8001
netstat -ano | findstr :3000

# 프로세스 종료 (PID 확인 후)
taskkill /PID [PID번호] /F
```

### MongoDB 연결 오류

1. `.env` 파일의 `MONGO_URI` 확인
2. MongoDB Atlas 네트워크 접근 설정 확인
3. 방화벽 설정 확인

---

## 📚 다음 단계

설치가 완료되었다면:

1. [README.md](README.md)에서 전체 기능 살펴보기
2. http://localhost:3000 에서 회원가입 후 플랫폼 사용해보기
3. http://localhost:8001/docs 에서 API 문서 확인하기

---

💡 **도움이 필요하시면 GitHub Issues에 문제를 제보해주세요!**