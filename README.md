# 🍒 Cherry Back Project - AI 분석 플랫폼

FastAPI 백엔드와 React 프론트엔드로 구성된 **자연어 기반 데이터 분석 플랫폼**입니다.  
무신사(의류 커머스) 데이터를 대상으로 **자연어 질의 → 데이터 조회/분석 → 시각화/리포트**까지 한 번에 처리합니다.

## 🚀 빠른 시작 가이드

### 📋 시스템 요구사항

- **Python 3.8+**
- **Node.js 16+**
- **MongoDB** (로컬 또는 클라우드)
- **Git**

---

## 🖥️ Windows 사용자 설정 가이드

### 1단계: 필수 프로그램 설치

#### Python 설치

1. [Python 공식 사이트](https://www.python.org/downloads/)에서 Python 3.8+ 다운로드
2. 설치 시 **"Add Python to PATH"** 체크박스 반드시 선택
3. 설치 확인:

```cmd
python --version
pip --version
```

#### Node.js 설치

1. [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전 다운로드
2. 기본 설정으로 설치
3. 설치 확인:

```cmd
node --version
npm --version
```

#### MongoDB 설치 (선택사항)

1. [MongoDB Community Edition](https://www.mongodb.com/try/download/community) 다운로드
2. 또는 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 클라우드 사용

#### Git 설치

1. [Git for Windows](https://git-scm.com/download/win) 다운로드
2. 기본 설정으로 설치

### 2단계: 프로젝트 클론 및 실행

#### PowerShell 또는 Command Prompt 열기

```cmd
# 1. 프로젝트 클론
git clone https://github.com/YOUR_USERNAME/cherry-back-project.git
cd cherry-back-project

# 2. Python 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate

# 3. Python 의존성 설치 (Windows 최적화 버전)
pip install -r requirements_windows.txt

# 또는 일반 버전 (더 많은 기능, 더 오래 걸림)
# pip install -r requirements.txt

# 또는 최소 버전 (AI 기능 제외, 빠른 설치)
# pip install -r requirements_minimal.txt

# 4. 환경변수 설정
copy .env.example .env
# .env 파일을 메모장으로 열어서 MongoDB URI 설정

# 5. 백엔드 서버 실행 (새 터미널)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 프론트엔드 실행 (새 터미널 창)

```cmd
cd cherry-back-project/frontend

# Node.js 의존성 설치
npm install

# React 개발 서버 실행
npm start
```

---

## 🐧 Linux/WSL 사용자 설정 가이드

### 1단계: 필수 패키지 설치

#### Ubuntu/Debian 계열

```bash
# 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Python 및 개발 도구 설치
sudo apt install python3 python3-pip python3-venv nodejs npm git mongodb -y

# Node.js 최신 버전 설치 (선택사항)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL 계열

```bash
# Python 및 개발 도구 설치
sudo yum install python3 python3-pip nodejs npm git -y

# MongoDB 설치 (별도 저장소 필요)
# 또는 Docker 사용: docker run -d -p 27017:27017 mongo
```

### 2단계: 프로젝트 실행

```bash
# 1. 프로젝트 클론
git clone https://github.com/YOUR_USERNAME/cherry-back-project.git
cd cherry-back-project

# 2. Python 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 3. Python 의존성 설치
pip install -r requirements.txt

# 4. 환경변수 설정
cp .env.example .env
nano .env  # 또는 vim .env

# 5. 백엔드 서버 실행 (백그라운드)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# 6. 프론트엔드 실행
cd frontend
npm install

# WSL 환경인 경우
npm run start:wsl

# 일반 Linux 환경인 경우
npm start
```

---

## 📦 Requirements 파일 설명

프로젝트에는 다양한 환경에 맞는 3가지 requirements 파일이 있습니다:

### 🖥️ requirements_windows.txt (Windows 권장)

- **Windows 최적화** 버전
- **CPU-only PyTorch** 사용으로 빠른 설치
- OpenTelemetry 모니터링 기능 제외
- Windows 전용 패키지 포함 (colorama, wmi)

### 🐧 requirements.txt (Linux/전체 기능)

- **모든 기능** 포함
- CUDA 지원 PyTorch
- 전체 모니터링 및 관측 도구
- 프로덕션 환경에 적합

### ⚡ requirements_minimal.txt (최소 기능)

- **기본 API 기능**만 포함
- AI/ML 기능 제외
- **빠른 개발 및 테스트**용
- 저사양 환경에 적합

---

## 🔧 환경설정 파일 (.env)

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# MongoDB 설정
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=cherry_back_db

# JWT 보안 키 (랜덤 문자열로 변경하세요)
SECRET_KEY=your-super-secret-key-change-this-in-production

# HuggingFace 토큰 (선택사항 - AI 모델 사용시)
HUGGINGFACE_HUB_TOKEN=hf_your_token_here

# 개발 환경 설정
ENVIRONMENT=development
```

---

## 🌐 접속 URL

설정이 완료되면 다음 주소로 접속할 수 있습니다:

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs (Swagger UI)

---

## 📂 프로젝트 구조

```
cherry-back-project/
├── app/                          # FastAPI 백엔드
│   ├── main.py                   # 진입점
│   ├── api/routes/               # API 라우트
│   ├── core/                     # 핵심 설정
│   ├── db/                       # 데이터베이스
│   ├── models/                   # 데이터 모델
│   ├── services/                 # 비즈니스 로직
│   └── langgraph/               # AI 워크플로우
├── frontend/                     # React 프론트엔드
│   ├── src/
│   │   ├── components/          # 재사용 컴포넌트
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── services/           # API 호출
│   │   └── contexts/           # React Context
│   ├── public/
│   └── package.json
├── requirements.txt              # Python 의존성
├── .env                         # 환경변수 (생성 필요)
└── README.md
```

---

## ✨ 주요 기능

### 🤖 AI 기반 자연어 분석

- 자연어 질문을 통한 데이터베이스 쿼리
- LangGraph를 활용한 워크플로우 자동화
- GPT 기반 인사이트 생성

### 📊 시각화 및 리포트

- Vega-Lite 기반 동적 차트 생성
- PDF 리포트 자동 생성
- 대시보드 및 분석 결과 저장

### 😊 감정 분석

- 3클래스 감정분석 (긍정/중립/부정)
- 속성별 세분화 감정 분석
- CSV 일괄 업로드 지원

### 🔐 사용자 인증

- JWT 기반 인증 시스템
- 사용자별 분석 이력 관리
- 권한 기반 접근 제어

---

## 🚑 문제해결

### 자주 발생하는 문제

#### 1. MongoDB 연결 오류

```bash
# MongoDB 서비스 시작 (Linux)
sudo systemctl start mongod

# MongoDB 상태 확인
sudo systemctl status mongod

# Windows에서는 MongoDB Compass 또는 서비스 관리자에서 확인
```

#### 2. 포트 충돌 오류

```bash
# 포트 사용 중인 프로세스 확인 (Linux/WSL)
lsof -i:8000  # 백엔드 포트
lsof -i:3000  # 프론트엔드 포트

# Windows에서는
netstat -ano | findstr :8000
```

#### 3. Python 의존성 설치 오류

```bash
# pip 업그레이드
pip install --upgrade pip

# 캐시 삭제 후 재설치
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

#### 4. Node.js 의존성 설치 오류

```bash
# npm 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json  # Linux/WSL
npm install
```

### WSL 사용자 추가 팁

WSL 환경에서는 파일 변경 감지를 위해 폴링 모드를 사용해야 합니다:

```bash
# 프론트엔드 실행시
npm run start:wsl
```

---

## 🔌 API 사용법

### 자연어 분석 요청

```bash
curl -X POST "http://localhost:8000/query/" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1", "query": "브랜드별 매출 현황을 보여줘"}'
```

### 감정분석 요청

```bash
curl -X POST "http://localhost:8000/sentiment/analyze-text" \
  -H "Content-Type: application/json" \
  -d '{"text": "배송이 빠르고 품질이 좋아요"}'
```

---

## 🤝 기여하기

1. 이 저장소를 Fork 합니다
2. 새 브랜치를 만듭니다: `git checkout -b feature/amazing-feature`
3. 변경사항을 커밋합니다: `git commit -m 'Add amazing feature'`
4. 브랜치에 Push 합니다: `git push origin feature/amazing-feature`
5. Pull Request를 생성합니다

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 지원

문제가 있거나 질문이 있으시면 다음을 통해 문의해주세요:

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/cherry-back-project/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/cherry-back-project/discussions)

---

## 🔄 업데이트 로그

### v1.0.0 (2024-12-18)

- 초기 릴리즈
- FastAPI + React 기본 구조
- LangGraph 기반 AI 워크플로우
- 감정분석 시스템
- JWT 인증 시스템

---

**즐거운 개발하세요! 🚀**
