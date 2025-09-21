# 🤖 AI Analytics Platform

MongoDB 데이터를 기반으로 한 스마트 AI 분석 플랫폼입니다. 자연어로 질문하면 AI가 데이터를 분석하고 인사이트를 제공합니다.

---

## 🚀 5분 안에 실행하기 (초간단 가이드)

**이것만 따라하세요! Windows 기준입니다.**

### 📌 1단계: 필수 프로그램 설치
1. [Python](https://www.python.org/downloads/) 설치 (설치할 때 **"Add Python to PATH"** 체크!)
2. [Node.js](https://nodejs.org/) 설치 (LTS 버전)
3. [Git](https://git-scm.com/download/win) 설치

### 📌 2단계: 프로젝트 다운로드
```bash
git clone https://github.com/your-username/ai-analytics-platform.git
cd ai-analytics-platform
```

### 📌 3단계: 환경 설정
```bash
# 1. Python 가상환경 만들기
python -m venv venv

# 2. 가상환경 활성화
venv\Scripts\activate

# 3. Python 패키지 설치
pip install -r requirements.txt

# 4. 환경변수 파일 복사
copy .env.example .env
```

**⚠️ 중요: `.env` 파일을 메모장으로 열어서 MongoDB 주소를 본인 것으로 수정하세요!**

### 📌 4단계: 프론트엔드 설정
**새 터미널 창을 여세요!**
```bash
# 1. frontend 폴더로 이동
cd frontend

# 2. 패키지 설치
npm install

# 3. 원래 폴더로 돌아오기
cd ..
```

### 📌 5단계: 실행
**터미널 2개가 필요합니다!**

**터미널 1:**
```bash
start-backend.bat
```

**터미널 2:**
```bash
start-frontend.bat
```

### 📌 6단계: 접속
브라우저를 열고 http://localhost:3000 접속!

### ✅ 끝!

**잘 안되면 [상세 가이드](#📋-사전-요구사항)를 확인하세요.**

---

## ✨ 주요 기능

- 🔐 **사용자 인증 시스템** - JWT 기반 로그인/회원가입
- 🗄️ **MongoDB 컬렉션 선택** - 여러 컬렉션을 선택하여 분석
- 🤖 **AI 자연어 분석** - 자연어로 질문하면 AI가 데이터 분석
- 📊 **시각화 결과** - Vega-Lite 기반 차트 생성
- 📤 **분석 결과 공유** - PDF 내보내기 및 공유 기능
- 🖼️ **이미지 검색** - 이미지 기반 검색 기능
- 👤 **프로필 관리** - 사용자 정보 수정

## 🛠️ 기술 스택

### 백엔드
- **FastAPI** - 고성능 Python 웹 프레임워크
- **MongoDB Atlas** - 클라우드 데이터베이스
- **Motor** - 비동기 MongoDB 드라이버
- **JWT** - 인증 토큰
- **Uvicorn** - ASGI 서버

### 프론트엔드
- **React 18** + **TypeScript**
- **Material-UI (MUI)** - UI 컴포넌트 라이브러리
- **React Router** - 라우팅
- **Axios** - HTTP 클라이언트
- **Vega-Lite** - 데이터 시각화

## 🚀 빠른 시작 가이드

## 📋 사전 요구사항

- **Node.js** 16.0.0 이상
- **Python** 3.8 이상
- **MongoDB Atlas** 계정 (또는 로컬 MongoDB)
- **Git**

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/ai-analytics-platform.git
cd ai-analytics-platform
```

### 2. 백엔드 설정

```bash
# Python 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (macOS/Linux)
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt
```

### 3. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# MongoDB 설정
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database
DB_NAME=your-database-name

# JWT 설정
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 외부 LLM API (선택사항)
COLAB_LLM_API=https://your-ngrok-address.ngrok-free.app/analyze
```

### 4. 프론트엔드 설정

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 패키지 설치
npm install

# 환경변수 설정 (frontend/.env.development)
echo "REACT_APP_API_URL=http://localhost:8001" > .env.development
```

### 5. 실행

**백엔드 실행:**
```bash
# 프로젝트 루트에서
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**프론트엔드 실행:**
```bash
# frontend 디렉토리에서
npm start
```

서버가 정상적으로 실행되면:
- 백엔드: http://localhost:8001
- 프론트엔드: http://localhost:3000
- API 문서: http://localhost:8001/docs

---

## 📂 프로젝트 구조

```
yk_back_front_img_search/
├── app/                          # 백엔드 FastAPI 애플리케이션
│   ├── api/                      # API 라우터
│   │   └── routes/               # 개별 라우트 파일들
│   │       ├── auth.py           # 인증 관련 API
│   │       ├── collections.py    # 컬렉션 관리 API
│   │       ├── llm_analysis.py   # AI 분석 API
│   │       ├── images.py         # 이미지 검색 API
│   │       └── ...
│   ├── core/                     # 핵심 설정
│   │   ├── config.py             # 환경변수 설정
│   │   └── security.py           # JWT 보안 설정
│   ├── db/                       # 데이터베이스 연결
│   │   └── mongodb.py            # MongoDB 설정
│   ├── models/                   # 데이터 모델
│   │   └── user.py               # 사용자 모델
│   ├── services/                 # 비즈니스 로직
│   └── main.py                   # FastAPI 메인 애플리케이션
├── frontend/                     # React 프론트엔드
│   ├── public/                   # 정적 파일
│   ├── src/                      # 소스 코드
│   │   ├── components/           # 재사용 가능한 컴포넌트
│   │   │   ├── Collections/      # 컬렉션 선택 컴포넌트
│   │   │   └── Layout/           # 레이아웃 컴포넌트
│   │   ├── contexts/             # React Context
│   │   ├── pages/                # 페이지 컴포넌트
│   │   │   ├── SmartAnalysisPage.tsx  # AI 분석 페이지
│   │   │   ├── LoginPage.tsx     # 로그인 페이지
│   │   │   └── ...
│   │   ├── services/             # API 서비스
│   │   ├── types/                # TypeScript 타입 정의
│   │   └── utils/                # 유틸리티 함수
│   ├── package.json              # npm 의존성
│   └── ...
├── requirements.txt              # Python 의존성
├── .env.example                  # 환경변수 예시
└── README.md                     # 이 파일
```

## 🔧 주요 API 엔드포인트

### 인증
- `POST /auth/login` - 로그인
- `POST /auth/register` - 회원가입
- `GET /auth/me` - 현재 사용자 정보
- `PUT /auth/profile` - 프로필 업데이트

### 컬렉션 관리
- `GET /api/collections` - MongoDB 컬렉션 목록
- `GET /api/collections/{collection_name}/info` - 컬렉션 정보

### AI 분석
- `POST /llm-analysis/analyze` - 자연어 AI 분석

### 기타
- `GET /health` - 서버 상태 확인
- `GET /docs` - API 문서 (Swagger UI)

## 🎯 사용 방법

1. **회원가입/로그인**: 사용자 계정을 생성하고 로그인합니다.

2. **컬렉션 선택**: 오른쪽 패널에서 분석하고 싶은 MongoDB 컬렉션을 선택합니다. (다중 선택 가능)

3. **AI 질문**: 자연어로 질문을 입력합니다.
   - 예: "최근 한 달간 가장 인기있는 상품 카테고리는 무엇인가요?"
   - 예: "신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘"

4. **결과 확인**: AI가 분석한 결과와 시각화를 확인합니다.

5. **공유**: 분석 결과를 PDF로 내보내거나 다른 사용자와 공유할 수 있습니다.

---

## 🔒 보안 설정

### JWT 토큰
- 액세스 토큰은 30분 후 만료됩니다.
- `SECRET_KEY`는 반드시 강력한 키로 설정하세요.

### CORS 설정
현재 개발 환경용으로 설정되어 있습니다. 프로덕션 환경에서는 `app/main.py`의 CORS 설정을 수정하세요.

## 🐛 문제 해결

### 일반적인 문제들

**1. MongoDB 연결 오류**
```
pymongo.errors.ServerSelectionTimeoutError
```
- `.env` 파일의 `MONGO_URI` 확인
- MongoDB Atlas 네트워크 접근 설정 확인
- 방화벽 설정 확인

**2. 프론트엔드 API 연결 오류**
```
CORS policy error
```
- 백엔드가 8001 포트에서 실행 중인지 확인
- `frontend/.env.development` 파일 확인

**3. 패키지 설치 오류**
```
pip install 실패
```
- Python 버전 확인 (3.8 이상)
- 가상환경 활성화 확인

### 로그 확인

**백엔드 로그:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload --log-level debug
```

**프론트엔드 로그:**
브라우저 개발자 도구 → Console 탭

## 🤝 기여하기

1. 이 저장소를 포크합니다.
2. 새로운 기능 브랜치를 생성합니다. (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다. (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다. (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다.

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 확인하세요.

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해 주세요.

---

**⭐ 이 프로젝트가 도움이 되었다면 별표를 눌러주세요!**
