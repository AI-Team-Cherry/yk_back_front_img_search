# 이미지 검색 시스템

AI 기반 이미지 검색 시스템으로, 텍스트와 이미지 두 가지 방식으로 패션 아이템을 검색할 수 있습니다.

## 🚀 빠른 시작

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python run.py
```

API 문서: http://localhost:8000/docs

## 📋 주요 기능

### 1. 텍스트 기반 이미지 검색
- 자연어로 이미지 검색
- 한국어 → 영어 자동 번역
- AI 기반 유사도 검색

### 2. 이미지 업로드 기반 검색
- 이미지 업로드로 유사한 이미지 찾기
- 인체 분할 및 의류 영역 추출
- 의류 카테고리 자동 분류

## 🔧 API 엔드포인트

### 텍스트 검색
- `GET /api/images/search?q={query}` - 자연어 검색
- `GET /api/images/list` - 이미지 목록 조회
- `GET /api/images/file/{filename}` - 이미지 파일 서빙
- `GET /api/images/download/{filename}` - 이미지 다운로드

### 이미지 검색
- `POST /search` - 이미지 업로드 검색
- `POST /catalog/add` - 이미지 등록
- `POST /meta/upsert` - 메타데이터 업데이트
- `DELETE /catalog/delete` - 이미지 삭제

## 🤖 사용된 AI 모델

- **CLIP**: OpenAI의 이미지-텍스트 매칭 모델
- **Fashion-CLIP**: 패션 특화 CLIP 모델
- **M2M100**: 다국어 번역 모델
- **FAISS**: 벡터 유사도 검색

## 📁 프로젝트 구조

```
img_srh/
├── routes/          # API 라우트
├── services/        # 비즈니스 로직
├── models/          # AI 모델
├── utils/           # 유틸리티
└── data/            # 데이터 파일
```

## 🛠️ 다른 프로젝트에 이식

1. `img_srh` 폴더를 새 프로젝트에 복사
2. `pip install -r requirements.txt` 실행
3. 기존 프로젝트에서 모듈 임포트하여 사용

자세한 내용은 `이식_가이드.txt` 파일을 참조하세요.
