# Mock 데이터 모드 사용 가이드

## 개요
백엔드 AI 모델이 동작하지 않을 때도 프론트엔드를 테스트할 수 있도록 Mock 데이터 모드를 구현했습니다.

## Mock 데이터 구조

### 1. 백엔드 응답 예시 (`/src/mockData/analysisResponses.ts`)

#### 자연어 쿼리 응답 (Vega-Lite 시각화 포함)
```javascript
{
  visualization: {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: "bar",
    data: { values: [...] },
    encoding: { x: {...}, y: {...}, color: {...} }
  },
  analysis: "AI 분석 결과 텍스트",
  data: [원시 데이터 배열]
}
```

#### 고급 분석 응답 (진행 상태 시뮬레이션)
- 시작 → 데이터 로딩 → 분석 중 → 완료
- 각 단계별로 progress (0-100%)와 메시지 표시
- 완료 시 상세 분석 결과와 차트 제공

#### ML 분석 응답
- 클러스터링: 고객 그룹 분류 결과와 차트
- 예측: 미래 트렌드 예측과 정확도
- 시계열: 시간에 따른 패턴 분석
- 이상치 탐지: 비정상 데이터 식별

## 사용 방법

### 1. Mock 모드 활성화
`.env.development` 파일에서:
```bash
REACT_APP_USE_MOCK_DATA=true
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm start
```

### 3. 테스트 가능한 기능

#### SearchPage (자연어 검색)
- 아무 질문이나 입력하면 예시 차트와 분석 결과가 표시됩니다
- 예: "최근 판매량 추이는?"

#### IntegratedAnalysisPage (고급 분석)
- 분석 질문 입력 후 "분석 시작" 클릭
- 진행률이 단계별로 표시되며 약 12초 후 완료
- 결과 탭에서 상세 분석과 차트 확인 가능

#### MLAnalyticsPage (ML 분석)
- 분석 유형 선택 (클러스터링, 예측 등)
- 컬렉션 선택 후 분석 실행
- 3초 후 결과 차트와 인사이트 표시

## Mock 데이터 커스터마이징

`/src/mockData/analysisResponses.ts` 파일에서 원하는 데이터로 수정 가능:

```javascript
// 차트 데이터 변경
data: {
  values: [
    {month: "2024-01", sentiment: "긍정", count: 120},
    // 더 많은 데이터 추가...
  ]
}

// AI 분석 텍스트 변경
analysis: "원하는 분석 내용..."

// 인사이트나 추천사항 변경
insights: "새로운 인사이트...",
recommendations: ["추천 1", "추천 2"]
```

## 실제 백엔드 연결로 전환

Mock 모드를 비활성화하려면:
```bash
REACT_APP_USE_MOCK_DATA=false
```

그러면 실제 백엔드 API로 요청이 전송됩니다.

## 주의사항

- Mock 데이터는 개발/테스트용입니다
- 실제 데이터 분석은 백엔드 AI 모델이 필요합니다
- Mock 모드에서는 데이터 저장이나 실제 분석이 수행되지 않습니다