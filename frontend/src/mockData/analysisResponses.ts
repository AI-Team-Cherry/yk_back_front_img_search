// AI 모델 응답 예시 데이터
export const mockAnalysisResponses = {
  // 통합 분석 응답 예시
  integratedAnalysis: {
    status: "ok",
    analysis: {
      query: "최근 3개월간 고객 리뷰의 긍정적/부정적 트렌드 분석",
      summary: "최근 3개월간 고객 리뷰 분석 결과, 전체적으로 긍정적인 평가가 65%로 우세했습니다. 특히 2월에 긍정 리뷰가 급증했으며, 이는 신제품 출시와 서비스 개선의 영향으로 보입니다.",
      mongo_results: [
        {
          date: "2024-01",
          positive: 120,
          negative: 80,
          neutral: 50
        },
        {
          date: "2024-02", 
          positive: 180,
          negative: 60,
          neutral: 40
        },
        {
          date: "2024-03",
          positive: 150,
          negative: 70,
          neutral: 45
        }
      ],
      rag_results: [
        {
          text: "2월 신제품 출시 후 '품질이 매우 향상되었다', '디자인이 세련되었다'는 긍정적 피드백이 다수 확인되었습니다.",
          score: 0.92
        },
        {
          text: "배송 지연과 고객 서비스 응답 속도에 대한 불만이 지속적으로 제기되고 있습니다.",
          score: 0.87
        }
      ],
      insights: "고객 만족도가 전반적으로 상승 추세이나, 물류 및 CS 부문의 개선이 시급합니다. 신제품에 대한 반응은 매우 긍정적이므로 이를 마케팅에 활용할 필요가 있습니다.",
      recommendations: [
        "물류 시스템 개선을 위한 투자 확대",
        "고객 서비스 인력 증원 및 교육 강화",
        "신제품의 긍정적 리뷰를 활용한 마케팅 캠페인 기획"
      ]
    },
    report: {
      title: "2024년 1분기 고객 리뷰 분석 보고서",
      createdAt: new Date().toISOString(),
      summary: "1분기 고객 리뷰 분석을 통해 제품 만족도 상승과 서비스 개선점을 확인했습니다.",
      details: {
        insights: "제품 품질에 대한 만족도는 크게 향상되었으나, 서비스 측면에서 개선이 필요합니다.",
        recommendations: [
          "물류 프로세스 최적화",
          "CS 응답 시간 단축",
          "긍정 리뷰 마케팅 활용"
        ]
      }
    }
  },

  // 고급 분석 상태 응답 예시 (진행 중)
  analysisStatusInProgress: {
    analysis_id: "analysis_12345",
    status: "analyzing",
    progress: 65,
    current_step: 3,
    total_steps: 5,
    message: "데이터 분석 중... AI 모델이 패턴을 분석하고 있습니다."
  },

  // 고급 분석 완료 응답 예시
  analysisStatusCompleted: {
    analysis_id: "analysis_12345",
    status: "completed",
    progress: 100,
    current_step: 5,
    total_steps: 5,
    message: "분석이 완료되었습니다.",
    result: {
      visualization: {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "월별 리뷰 감성 분석 차트",
        width: 600,
        height: 400,
        data: {
          values: [
            {month: "2024-01", sentiment: "긍정", count: 120},
            {month: "2024-01", sentiment: "부정", count: 80},
            {month: "2024-01", sentiment: "중립", count: 50},
            {month: "2024-02", sentiment: "긍정", count: 180},
            {month: "2024-02", sentiment: "부정", count: 60},
            {month: "2024-02", sentiment: "중립", count: 40},
            {month: "2024-03", sentiment: "긍정", count: 150},
            {month: "2024-03", sentiment: "부정", count: 70},
            {month: "2024-03", sentiment: "중립", count: 45}
          ]
        },
        mark: "bar",
        encoding: {
          x: {
            field: "month",
            type: "nominal",
            title: "월",
            axis: {labelAngle: 0}
          },
          y: {
            field: "count",
            type: "quantitative",
            title: "리뷰 수"
          },
          color: {
            field: "sentiment",
            type: "nominal",
            title: "감성",
            scale: {
              domain: ["긍정", "부정", "중립"],
              range: ["#4CAF50", "#F44336", "#9E9E9E"]
            }
          },
          xOffset: {field: "sentiment"}
        }
      },
      analysis: `## 고객 리뷰 감성 분석 결과

### 주요 발견사항
1. **전체적인 추세**: 3개월 평균 긍정률 65%, 부정률 25%, 중립 10%
2. **월별 변화**:
   - 1월: 긍정 120건 (48%), 부정 80건 (32%)
   - 2월: 긍정 180건 (64%), 부정 60건 (21%) - 가장 높은 긍정률
   - 3월: 긍정 150건 (59%), 부정 70건 (28%)

### AI 분석 인사이트
- 2월의 긍정 리뷰 급증은 신제품 출시와 프로모션 효과로 분석됨
- 부정 리뷰의 주요 원인: 배송 지연(40%), CS 응답 속도(35%), 제품 하자(25%)
- 중립 리뷰는 주로 단순 제품 문의나 기능 설명 요청

### 추천 액션
1. 물류 시스템 개선으로 배송 만족도 향상
2. CS 팀 확충 및 챗봇 도입 검토
3. 2월 성공 사례를 벤치마킹한 마케팅 전략 수립`,
      data: [
        {month: "2024-01", positive: 120, negative: 80, neutral: 50, total: 250},
        {month: "2024-02", positive: 180, negative: 60, neutral: 40, total: 280},
        {month: "2024-03", positive: 150, negative: 70, neutral: 45, total: 265}
      ],
      model_status: {
        status: "ready",
        model: "gpt-2-sentiment-analysis",
        type: "text-classification"
      },
      prediction_basis: "과거 3개월 데이터와 유사 업종 벤치마크 데이터를 기반으로 분석했습니다."
    }
  },

  // 실제 AI 응답 형식으로 업데이트된 자연어 쿼리 응답 예시
  naturalLanguageQuery: {
    status: "success",
    query: "2024년 매출 트렌드를 분석해줘",
    mongodb_results: {
      collection: "product",
      pipeline: [
        { "$match": { "category_l1": "상의/스웨트" } },
        { "$sort": { "price": -1 } },
        { "$limit": 5 }
      ],
      data: [
        {
          "_id": "68c2166cbcd19aea7020673d",
          "product_id": "3175071",
          "name": "로고 오가닉 코튼 맨투맨 - 블루",
          "brand": "메종 마르지엘라",
          "category_l1": "상의/스웨트",
          "gender": "M",
          "price": 334990,
          "views_1m": 2600,
          "sales_cum": 0,
          "hearts": 444,
          "reviews_count": 7,
          "rating_avg": 5.0,
          "main_image": "3175071_1",
          "image_files": "[\"3175071_1\", \"3175071_2\"]"
        },
        {
          "_id": "68c2166cbcd19aea7020673e",
          "product_id": "5276013",
          "name": "베이직 상의",
          "brand": "트릴리온",
          "category_l1": "상의/스웨트",
          "gender": "UNISEX",
          "price": 39800,
          "views_1m": 20000,
          "sales_cum": 400,
          "hearts": 0,
          "reviews_count": 13,
          "rating_avg": 4.6,
          "main_image": "5276013_1",
          "image_files": "[\"5276013_1\", \"5276013_2\"]"
        },
        {
          "_id": "68c2166cbcd19aea70206742",
          "product_id": "UTL-01",
          "name": "스트라이프 럭비 카라 맨투맨",
          "brand": "더그린랩",
          "category_l1": "상의/스웨트",
          "gender": "F",
          "price": 55200,
          "views_1m": 0,
          "sales_cum": 0,
          "hearts": 8300,
          "reviews_count": 136,
          "rating_avg": 4.7,
          "main_image": "UTL-01_1",
          "image_files": "[\"UTL-01_1\", \"UTL-01_2\"]"
        }
      ],
      summary: "상의/스웨트 카테고리에서 3건의 결과가 검색되었습니다."
    },
    vector_results: {
      context: [
        "2024년 상반기 패션 트렌드에서 스웨트셔츠가 주목받고 있습니다.",
        "메종 마르지엘라 브랜드가 프리미엄 스웨트 시장을 주도하고 있습니다.",
        "유니섹스 제품의 인기가 증가하는 추세입니다."
      ],
      similarity_scores: [0.9, 0.85, 0.8]
    },
    ai_analysis: {
      answer: "답변: 상위 3개 브랜드 기준 총매출은 429,990원이며 1위는 메종 마르지엘라 334,990원(점유 78.0%)입니다.\n인사이트: 메종 마르지엘라가 압도적 시장 점유율을 보이며, 프리미엄 브랜드 선호도가 높습니다. 평균 가격은 143,330원으로 고가 제품군이 주를 이룹니다.\n추천사항: (1) 메종 마르지엘라 유사 프리미엄 브랜드 확대 (2) 중가격대 제품 라인업 강화 (3) 유니섹스 제품 비중 확대",
      insights: "프리미엄 브랜드 집중 현상이 뚜렷하며, 소비자들이 품질을 중시하는 경향을 보입니다.",
      recommendations: "프리미엄 라인 확대 및 중가격대 제품 개발을 통한 고객층 다변화"
    },
    visualizations: [
      {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "브랜드별 가격 분포 - 시각화",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"brand": "메종 마르지엘라", "price": 334990, "hearts": 444, "rating": 5.0},
            {"brand": "더그린랩", "price": 55200, "hearts": 8300, "rating": 4.7},
            {"brand": "트릴리온", "price": 39800, "hearts": 0, "rating": 4.6}
          ]
        },
        "mark": {"type": "bar", "tooltip": true},
        "encoding": {
          "x": {"field": "brand", "type": "nominal", "title": "브랜드"},
          "y": {"field": "price", "type": "quantitative", "title": "가격 (원)"},
          "color": {
            "field": "rating",
            "type": "quantitative",
            "title": "평점",
            "scale": {"scheme": "viridis"}
          }
        }
      }
    ],
    report: {
      title: "2024년 매출 트렌드 분석 리포트",
      createdAt: new Date().toISOString(),
      summary: "상의/스웨트 카테고리 분석을 통해 브랜드별 시장 점유율과 소비자 선호도를 확인했습니다.",
      details: {
        insights: "메종 마르지엘라가 프리미엄 시장을 주도하며, 고가 제품에 대한 소비자 선호도가 높습니다.",
        recommendations: [
          "프리미엄 브랜드 라인업 확대",
          "중가격대 제품 개발로 고객층 다변화",
          "평점 높은 브랜드 중심의 마케팅 전략 수립"
        ]
      }
    }
  }
};

// 시뮬레이션을 위한 헬퍼 함수들
export const simulateAnalysisProgress = (callback: (status: any) => void) => {
  const steps = [
    {progress: 0, status: "starting", message: "분석을 시작합니다..."},
    {progress: 20, status: "data_loading", message: "데이터를 로드하는 중..."},
    {progress: 40, status: "analyzing", message: "AI 모델이 데이터를 분석 중..."},
    {progress: 60, status: "analyzing", message: "패턴을 식별하는 중..."},
    {progress: 80, status: "analyzing", message: "시각화를 생성하는 중..."},
    {progress: 100, status: "completed", message: "분석이 완료되었습니다!"}
  ];

  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      callback({
        analysis_id: "mock_analysis_" + Date.now(),
        status: step.status,
        progress: step.progress,
        current_step: currentStep + 1,
        total_steps: steps.length,
        message: step.message,
        result: currentStep === steps.length - 1 ? mockAnalysisResponses.analysisStatusCompleted.result : undefined
      });
      currentStep++;
    } else {
      clearInterval(interval);
    }
  }, 2000); // 2초마다 진행

  return interval;
};