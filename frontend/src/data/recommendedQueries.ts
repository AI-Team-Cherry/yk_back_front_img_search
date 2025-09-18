import { AnalysisResult } from '../types';

export interface RecommendedQuery {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'advanced' | 'expert';
  result: AnalysisResult;
}

export const recommendedQueries: RecommendedQuery[] = [
  {
    id: 'new-user-purchase-prediction',
    title: '신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘',
    description: '신규 가입 고객의 구매 전환 예측 분석',
    category: '고객 예측 분석',
    difficulty: 'expert',
    result: {
      analysis: `## 신규 가입자 30일 내 첫 구매 확률 예측 모델

### 📋 모델 설계 정보
- **관측 단위**: buyer_id (가입 Cohort별)
- **라벨 정의**: Y=1 (signup_date+30일 내 첫 구매), Y=0 (30일 내 미구매)
- **모델**: RandomForestClassifier (class_weight='balanced')
- **학습 데이터**: 과거 6개월 신규 가입자 74,829명

### 🎯 모델 성능 지표
- **ROC-AUC**: 0.89
- **PR-AUC**: 0.84 (불균형 데이터 고려)
- **F1-Score**: 0.82
- **정밀도**: 0.87 | **재현율**: 0.78

### 🔍 핵심 Feature Importance (상위 10개)

1. **가입 후 48h 내 PDP 조회 수** (0.24) - 가장 강력한 예측 변수
2. **마케팅 수신 동의 여부** (0.18) - 구매 의향 강도 지표
3. **가입 후 48h 내 세션 수** (0.16) - 초기 앱 몰입도
4. **유입 채널 (organic/paid)** (0.14) - 자연 유입 > 유료 광고
5. **연령대 (20-30대)** (0.12) - 핵심 타겟층
6. **장바구니 추가 수 (48h)** (0.11) - 구매 의향 행동
7. **찜/하트 수 (48h)** (0.09) - 관심도 지표
8. **웰컴 쿠폰 보유 여부** (0.08) - 첫 구매 유도 효과
9. **구독 브랜드 수** (0.06) - 브랜드 선호도
10. **첫 로그인 디바이스 (Mobile)** (0.05) - 접근성 영향

### 📊 예측 결과 분포

**고확률 세그먼트 (p ≥ 0.8)**: 8,247명 (11.0%)
- 30일 내 예상 전환율: 87.3%
- 예상 첫 구매 매출: ₩627,000,000
- 평균 AOV: ₩76,000

**중확률 세그먼트 (0.5 ≤ p < 0.8)**: 21,892명 (29.2%) 
- 30일 내 예상 전환율: 64.7%
- 예상 첫 구매 매출: ₩892,000,000
- 평균 AOV: ₩63,000

**저확률 세그먼트 (p < 0.5)**: 44,690명 (59.8%)
- 30일 내 예상 전환율: 23.1%
- 예상 첫 구매 매출: ₩376,000,000
- 평균 AOV: ₩37,000

### 🎯 액션 플랜

**1. Tier 1 (p ≥ 0.8): 개인화 공격적 마케팅**
- 가입 후 6시간 내 개인화 푸시 알림
- 24시간 내 ₩10,000 쿠폰 + 무료배송
- 1:1 스타일링 서비스 연결
- **예상 ROI**: 420%

**2. Tier 2 (0.5-0.8): 관심 증진 마케팅**
- 48시간 내 관심 카테고리 기반 콘텐츠 발송
- 첫 구매 ₩5,000 쿠폰 (7일 유효)
- 브랜드 팔로우 유도 캠페인
- **예상 ROI**: 280%

**3. Tier 3 (< 0.5): 장기 육성 전략**
- 주간 트렌드 뉴스레터 구독 유도
- 월별 스타일 팁 콘텐츠 제공
- 특가 이벤트 선발송 (월 1회)
- **예상 ROI**: 150%`,
      
      visualization: {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "Feature Importance: 신규 가입자 첫 구매 예측 모델",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"feature": "48h 내 PDP 조회수", "importance": 0.24, "category": "행동"},
            {"feature": "마케팅 수신동의", "importance": 0.18, "category": "마케팅"},
            {"feature": "48h 내 세션수", "importance": 0.16, "category": "행동"},
            {"feature": "유입채널 (organic)", "importance": 0.14, "category": "획득"},
            {"feature": "연령대 (20-30대)", "importance": 0.12, "category": "인구통계"},
            {"feature": "장바구니 추가수", "importance": 0.11, "category": "행동"},
            {"feature": "찜/하트 수", "importance": 0.09, "category": "관심"},
            {"feature": "웰컴쿠폰 보유", "importance": 0.08, "category": "마케팅"},
            {"feature": "구독브랜드 수", "importance": 0.06, "category": "관심"},
            {"feature": "모바일 디바이스", "importance": 0.05, "category": "기술"}
          ]
        },
        "mark": {
          "type": "bar",
          "tooltip": true,
          "cornerRadiusEnd": 4
        },
        "encoding": {
          "y": {
            "field": "feature",
            "type": "nominal",
            "title": "피처",
            "sort": "-x"
          },
          "x": {
            "field": "importance",
            "type": "quantitative",
            "title": "Feature Importance",
            "scale": {"domain": [0, 0.25]}
          },
          "color": {
            "field": "category",
            "type": "nominal",
            "scale": {
              "domain": ["행동", "마케팅", "획득", "인구통계", "관심", "기술"],
              "range": ["#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a", "#0ea5e9"]
            },
            "legend": {"title": "피처 카테고리"}
          }
        }
      },
      
      data: [
        {
          "buyer_id": "USR_2024_001247",
          "signup_date": "2024-09-10",
          "p_conv30": 0.92,
          "top_features": "PDP_48h:23, marketing_opt:1, sessions_48h:8",
          "segment": "High",
          "predicted_aov": 78000,
          "acquisition_channel": "organic"
        },
        {
          "buyer_id": "USR_2024_001248", 
          "signup_date": "2024-09-10",
          "p_conv30": 0.87,
          "top_features": "PDP_48h:18, cart_adds:3, age_group:25-30",
          "segment": "High",
          "predicted_aov": 71000,
          "acquisition_channel": "paid_social"
        },
        {
          "buyer_id": "USR_2024_001249",
          "signup_date": "2024-09-10",
          "p_conv30": 0.84,
          "top_features": "sessions_48h:12, hearts:5, welcome_coupon:1", 
          "segment": "High",
          "predicted_aov": 69000,
          "acquisition_channel": "organic"
        },
        {
          "buyer_id": "USR_2024_001250",
          "signup_date": "2024-09-10",
          "p_conv30": 0.73,
          "top_features": "PDP_48h:8, marketing_opt:1, mobile_device:1",
          "segment": "Med",
          "predicted_aov": 62000,
          "acquisition_channel": "referral"
        },
        {
          "buyer_id": "USR_2024_001251",
          "signup_date": "2024-09-10",
          "p_conv30": 0.68,
          "top_features": "sessions_48h:4, age_group:20-25, brand_follows:2",
          "segment": "Med", 
          "predicted_aov": 58000,
          "acquisition_channel": "organic"
        }
      ],
      
      model_status: {
        status: "ready",
        model: "RandomForestClassifier (class_weight=balanced)",
        type: "binary_classification"
      },
      
      prediction_basis: "시간누수 차단: 가입일 기준 과거 Cohort로 학습, 최근 Cohort로 검증. buyers ⋈ orders (signup_date+30일 내 first_order_date) 라벨링. 48h 내 행동 피처 + 인구통계 + 마케팅 메타데이터 활용."
    }
  },

  {
    id: 'churn-prevention-coupon',
    title: '이탈 위험 높은데 쿠폰 주면 돌아올 확률 큰 고객만 골라줘',
    description: '이탈 위험 고객 중 쿠폰 마케팅 효과가 높은 세그먼트 분석',
    category: '이탈 방지 마케팅',
    difficulty: 'expert',
    result: {
      analysis: `## 이탈 위험 고객 쿠폰 업리프트 모델 (T-Learner)

### 📋 모델 설계 정보
- **관측 단위**: buyer_id (캠페인 대상 윈도우별)
- **이탈 위험 정의**: 직전 60일 무구매 + RFM 하위 세그먼트
- **업리프트 점수**: p_T(buy|쿠폰) - p_C(buy|무처리) 
- **모델**: 2개 RandomForest 분류기 (처리군/대조군)
- **평가 윈도우**: 쿠폰 발급 후 14일 내 구매 여부

### 🎯 T-Learner 모델 성능
**처리군 모델 (쿠폰 받은 고객)**
- ROC-AUC: 0.91 | PR-AUC: 0.84
- 정밀도: 0.87 | 재현율: 0.89

**대조군 모델 (쿠폰 없는 고객)**
- ROC-AUC: 0.88 | PR-AUC: 0.79
- 정밀도: 0.83 | 재현율: 0.85

**업리프트 검증 (Qini Coefficient)**: 0.73

### 🔍 핵심 업리프트 드라이버 피처

1. **과거 쿠폰 사용률** (0.31) - 할인 민감도 최강 지표
2. **RFM_Recency (일수)** (0.24) - 마지막 구매 후 경과일
3. **RFM_Frequency (횟수)** (0.19) - 과거 구매 빈도
4. **평균 AOV** (0.16) - 고객 가치 수준
5. **브랜드 다양성 지수** (0.13) - 탐험적 vs 충성적 성향
6. **이메일 오픈율** (0.11) - 마케팅 반응성
7. **주 구매 요일 패턴** (0.09) - 구매 타이밍 예측성
8. **카테고리 집중도** (0.08) - 전문성 vs 일반성
9. **디바이스 선호도** (0.07) - 모바일 vs 데스크톱
10. **푸시 알림 수신 여부** (0.06) - 즉시성 마케팅 수용도

### 📊 업리프트 세그먼트 분석

**High Uplift (τ ≥ 0.25)**: 2,847명
- 평균 업리프트: +32.4%p
- 처리군 구매율: 67.8% | 대조군: 35.4%
- 예상 증분 매출: ₩428,000,000
- **특징**: 과거 쿠폰 사용 5회+, 60-90일 이탈

**Medium Uplift (0.10 ≤ τ < 0.25)**: 4,291명  
- 평균 업리프트: +16.7%p
- 처리군 구매율: 52.3% | 대조군: 35.6%
- 예상 증분 매출: ₩324,000,000
- **특징**: 브랜드 충성고객, 이메일 반응 양호

**Low Uplift (0.05 ≤ τ < 0.10)**: 3,108명
- 평균 업리프트: +7.2%p  
- 처리군 구매율: 38.9% | 대조군: 31.7%
- 예상 증분 매출: ₩89,000,000
- **특징**: 신규 고객, 할인 경험 부족

**Negative/No Uplift (τ < 0.05)**: 1,624명
- 평균 업리프트: -2.1%p
- **전략**: 쿠폰 발송 제외 (비용 절약)

### 💰 Qini Curve 기반 최적 타겟팅

**상위 30% 타겟팅 시 (7,138명)**
- 총 증분 구매: 2,247건 (+31.5%)
- 증분 매출: ₩752,000,000
- 쿠폰 비용: ₩89,000,000 (평균 12.5% 할인)
- **순 ROI**: 745%

**상위 50% 타겟팅 시 (11,898명)**
- 총 증분 구매: 3,104건 (+26.1%) 
- 증분 매출: ₩981,000,000
- 쿠폰 비용: ₩143,000,000
- **순 ROI**: 586%

### 🎯 실행 전략 (업리프트 기반)

**Tier 1 (High Uplift): 즉시 실행**
- 개인화 15% 쿠폰 + 무료배송
- 발송 타이밍: 목요일 14:00 (이메일 오픈율 최고)
- 유효기간: 72시간 (긴급감 극대화)
- 예상 증분 ROI: 745%

**Tier 2 (Medium Uplift): 단계별 실행**  
- 선호 카테고리 10% 쿠폰
- A/B 테스트: 할인율 vs 적립금
- 발송 주기: 월 1회 정기 발송
- 예상 증분 ROI: 456%

**Tier 3 (Low Uplift): 저비용 전략**
- 5% 쿠폰 또는 무료배송만
- 분기별 재활성화 캠페인
- 예상 증분 ROI: 285%`,

      visualization: {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "Qini Curve: 쿠폰 업리프트 모델 성능",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"타겟비율": 0, "누적증분구매": 0, "random_baseline": 0},
            {"타겟비율": 10, "누적증분구매": 847, "random_baseline": 284},
            {"타겟비율": 20, "누적증분구매": 1523, "random_baseline": 568},
            {"타겟비율": 30, "누적증분구매": 2247, "random_baseline": 852},
            {"타겟비율": 40, "누적증분구매": 2834, "random_baseline": 1136},
            {"타겟비율": 50, "누적증분구매": 3291, "random_baseline": 1420},
            {"타겟비율": 60, "누적증분구매": 3642, "random_baseline": 1704},
            {"타겟비율": 70, "누적증분구매": 3918, "random_baseline": 1988},
            {"타겟비율": 80, "누적증분구매": 4124, "random_baseline": 2272},
            {"타겟비율": 90, "누적증분구매": 4287, "random_baseline": 2556},
            {"타겟비율": 100, "누적증분구매": 4420, "random_baseline": 2840}
          ]
        },
        "layer": [
          {
            "mark": {
              "type": "line",
              "point": true,
              "tooltip": true,
              "strokeWidth": 3,
              "color": "#dc2626"
            },
            "encoding": {
              "x": {"field": "타겟비율", "type": "quantitative", "title": "타겟팅 비율 (%)"},
              "y": {"field": "누적증분구매", "type": "quantitative", "title": "누적 증분 구매 건수"}
            }
          },
          {
            "mark": {
              "type": "line", 
              "strokeDash": [5, 5],
              "color": "#94a3b8",
              "strokeWidth": 2
            },
            "encoding": {
              "x": {"field": "타겟비율", "type": "quantitative"},
              "y": {"field": "random_baseline", "type": "quantitative"}
            }
          }
        ]
      },

      data: [
        {
          "buyer_id": "CHN_2024_007842",
          "churn_risk_flag": 1,
          "uplift_score": 0.324,
          "p_treated": 0.678,
          "p_control": 0.354, 
          "action": "send_coupon_15pct",
          "top_features": "coupon_usage_rate:0.73, rfm_recency:67, aov:156000"
        },
        {
          "buyer_id": "CHN_2024_007843",
          "churn_risk_flag": 1,
          "uplift_score": 0.289,
          "p_treated": 0.634,
          "p_control": 0.345,
          "action": "send_coupon_15pct", 
          "top_features": "coupon_usage_rate:0.68, brand_diversity:0.42, email_open_rate:0.89"
        },
        {
          "buyer_id": "CHN_2024_007844",
          "churn_risk_flag": 1,
          "uplift_score": 0.267,
          "p_treated": 0.612,
          "p_control": 0.345,
          "action": "send_coupon_15pct",
          "top_features": "rfm_frequency:12, category_concentration:0.73, mobile_device:1"
        },
        {
          "buyer_id": "CHN_2024_007845", 
          "churn_risk_flag": 1,
          "uplift_score": 0.178,
          "p_treated": 0.534,
          "p_control": 0.356,
          "action": "send_coupon_10pct",
          "top_features": "aov:89000, purchase_dow_pattern:weekend, push_enabled:1"
        },
        {
          "buyer_id": "CHN_2024_007846",
          "churn_risk_flag": 1,
          "uplift_score": 0.071,
          "p_treated": 0.402,
          "p_control": 0.331,
          "action": "send_freeship_only",
          "top_features": "rfm_recency:134, new_customer:1, discount_sensitivity:0.23"
        }
      ],

      model_status: {
        status: "ready", 
        model: "T-Learner (2x RandomForestClassifier)",
        type: "uplift_modeling"
      },

      prediction_basis: "Temporal split으로 시간누수 차단. 과거 캠페인 로그에서 처리군/대조군 라벨링 → 14일 윈도우 내 구매 여부로 Y 생성. RFM + 할인민감도 + 브랜드다양성 피처 활용. Qini Curve 검증."
    }
  },

  {
    id: 'pricing-elasticity-analysis',
    title: '이번 주에 상의/하의 각 5% 가격 인하하면 예측 판매량이 얼마나 늘까?',
    description: '가격 탄력성 기반 상의/하의 카테고리 할인 효과 예측',
    category: '가격 최적화',
    difficulty: 'expert',
    result: {
      analysis: `## 상의/하의 5% 가격 인하 판매량 증가 예측

### 📊 가격 탄력성 분석 결과

**분석 기간**: 현재 주차 (7일간) 예측
**모델 정확도**: 94.7% (MAPE: 5.3%)

### 🏷️ 상의 카테고리 (5% 할인 시)

**현재 주간 예상 판매량**: 12,847개
**할인 후 예상 판매량**: 17,235개 (+34.1% ↗️)

**세부 분석**:
- **티셔츠/탱크톱**: +42% (가격 민감도 높음)
- **셔츠/블라우스**: +28% (브랜드 의존도 높음)  
- **스웨터/니트**: +31% (계절성 영향)
- **후드/맨투맨**: +38% (젊은층 선호)

**예상 매출 변화**:
- 기존 예상 매출: 1,847,600,000원
- 할인 후 예상 매출: 2,203,200,000원
- **순증 매출**: +355,600,000원 (+19.3%)

### 👖 하의 카테고리 (5% 할인 시)

**현재 주간 예상 판매량**: 8,924개  
**할인 후 예상 판매량**: 11,387개 (+27.6% ↗️)

**세부 분석**:
- **청바지**: +31% (스테이플 아이템으로 가격 민감)
- **팬츠/슬랙스**: +22% (고가 브랜드는 탄력성 낮음)
- **쇼츠/반바지**: +35% (여름 시즌 높은 반응)
- **스커트**: +26% (트렌드 아이템 중심)

**예상 매출 변화**:
- 기존 예상 매출: 1,234,800,000원
- 할인 후 예상 매출: 1,498,500,000원  
- **순증 매출**: +263,700,000원 (+21.4%)

### 💡 핵심 인사이트

1. **가격 탄력성 차이**
   - 상의: -1.68 (탄력적 - 가격 변화에 민감)
   - 하의: -1.38 (상대적으로 덜 탄력적)

2. **브랜드별 반응도**
   - **프리미엄 브랜드**: 할인 효과 제한적 (+15-20%)
   - **중저가 브랜드**: 할인 효과 극대화 (+40-50%)
   - **트렌디 브랜드**: 젊은층 중심 높은 반응 (+35-45%)

3. **시간대별 구매 패턴**
   - 할인 공지 후 첫 24시간: 전체 증가량의 60%
   - 주말 효과: 평일 대비 2.3배 높은 구매율

### 🎯 전략 제안

**즉시 실행 권장**:
1. **상의 우선 할인**: ROI가 더 높음 (19.3% vs 21.4%)
2. **타이밍**: 목요일 오후 런칭으로 주말 효과 극대화
3. **재고 관리**: 예상 증가량 대비 130% 재고 확보 필요

**주의사항**:
- 할인 후 정가 복귀 시 일시적 매출 감소 예상 (-15%)
- 브랜드 포지셔닝 영향 최소화를 위한 "특별 기획전" 포장 권장`,

      visualization: {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "5% 가격 할인 시 상의/하의 판매량 증가 예측",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"카테고리": "상의", "할인전": 12847, "할인후": 17235, "증가율": 34.1, "매출증가": 355600000},
            {"카테고리": "하의", "할인전": 8924, "할인후": 11387, "증가율": 27.6, "매출증가": 263700000}
          ]
        },
        "layer": [
          {
            "mark": {"type": "bar", "tooltip": true, "width": 40},
            "encoding": {
              "x": {"field": "카테고리", "type": "nominal", "title": "카테고리"},
              "y": {"field": "할인전", "type": "quantitative", "title": "판매량 (개)"},
              "color": {"value": "#94a3b8"}
            }
          },
          {
            "mark": {"type": "bar", "tooltip": true, "width": 40, "xOffset": 45},
            "encoding": {
              "x": {"field": "카테고리", "type": "nominal"},
              "y": {"field": "할인후", "type": "quantitative"},
              "color": {"value": "#059669"}
            }
          },
          {
            "mark": {"type": "text", "dy": -10, "fontSize": 12, "fontWeight": "bold"},
            "encoding": {
              "x": {"field": "카테고리", "type": "nominal"},
              "y": {"field": "할인후", "type": "quantitative"},
              "text": {"field": "증가율", "type": "quantitative", "format": "+.1f"},
              "color": {"value": "#059669"}
            }
          }
        ]
      },

      data: [
        {
          "category": "상의",
          "beforeDiscount": 12847,
          "afterDiscount": 17235,
          "increaseRate": 34.1,
          "revenueIncrease": 355600000,
          "priceElasticity": -1.68
        },
        {
          "category": "하의", 
          "beforeDiscount": 8924,
          "afterDiscount": 11387,
          "increaseRate": 27.6,
          "revenueIncrease": 263700000,
          "priceElasticity": -1.38
        }
      ],

      model_status: {
        status: "ready",
        model: "Price Elasticity Model (Ridge Regression)",
        type: "forecasting"
      },

      prediction_basis: "과거 24개월 할인 이벤트 데이터와 가격-판매량 상관관계 분석을 통한 가격 탄력성 모델"
    }
  },

  {
    id: 'cart-abandonment-prediction',
    title: '장바구니에 담고 나간 사람 중 48시간 내 결제할 가능성 높은 사용자만 알려줘',
    description: '장바구니 이탈 고객의 48시간 내 구매 전환 예측',
    category: '전환율 최적화',
    difficulty: 'expert',
    result: {
      analysis: `## 장바구니 이탈 고객 48시간 내 구매 전환 예측

### 🛒 분석 대상: 최근 24시간 장바구니 이탈 고객 15,847명

**예측 모델 성능**: 정확도 89.4%, Precision 0.87, Recall 0.91

### 🎯 48시간 내 구매 확률 높은 고객: 4,286명 (27%)

### 📊 구매 확률별 세그먼트 분석

**1. 초고확률 그룹 (85-95% 확률) - 1,247명**
- **특징**: 결제 페이지까지 진행 후 이탈
- **장바구니 평균 금액**: 127,000원
- **과거 장바구니→구매 전환율**: 78%
- **주요 이탈 이유**: 배송비, 결제 수단 이슈

**2. 고확률 그룹 (70-84% 확률) - 1,891명** 
- **특징**: 회원 로그인 후 여러 상품 담기
- **장바구니 평균 금액**: 89,000원
- **앱 재방문 패턴**: 6시간 내 2회 이상
- **주요 이탈 이유**: 가격 비교, 할인 대기

**3. 중고확률 그룹 (55-69% 확률) - 1,148명**
- **특징**: 신규 가입자 또는 간헐적 구매자
- **장바구니 평균 금액**: 64,000원  
- **위시리스트 활용**: 장바구니 상품 중 40% 이미 위시리스트
- **주요 이탈 이유**: 사이즈/색상 고민, 리뷰 부족

### ⏰ 시간대별 구매 전환 패턴

**첫 6시간**: 전체 구매의 45% 발생
- 오후 2-6시: 최고 전환율 (34%)
- 저녁 7-10시: 두 번째 피크 (28%)

**6-24시간**: 전체 구매의 35% 발생  
- 다음날 오전: 출근길 모바일 구매 증가
- 점심시간: 잠깐 결제 완료 패턴

**24-48시간**: 전체 구매의 20% 발생
- 주말 효과: 평일 대비 2배 높은 전환율
- 페이데이 효과: 월말/월초 구매 집중

### 🎯 타겟별 마케팅 전략

**A. 초고확률 그룹 (즉시 실행)**
- **전략**: 결제 프로세스 간소화 안내
- **메시지**: "간편결제로 30초만에 완료하세요"
- **인센티브**: 무료배송 쿠폰 (2시간 내 제한)
- **예상 전환율**: 92%

**B. 고확률 그룹 (6시간 내)**
- **전략**: 개인화된 할인 혜택 제공
- **메시지**: "고객님만을 위한 특별 할인 5%"
- **인센티브**: 장바구니 금액별 차등 할인
- **예상 전환율**: 76%

**C. 중고확률 그룹 (24시간 내)**
- **전략**: 상품 신뢰도 제고 + 구매 후기
- **메시지**: "다른 고객들이 선택한 이유를 확인하세요"
- **인센티브**: 무료 반품/교환 보장
- **예상 전환율**: 61%

### 💰 예상 비즈니스 임팩트

**총 예상 회수 매출**: 318,400,000원
- 초고확률 그룹: 145,800,000원 (92% 전환 시)
- 고확률 그룹: 127,900,000원 (76% 전환 시)  
- 중고확률 그룹: 44,700,000원 (61% 전환 시)

**마케팅 ROI**: 1,250% (평균 전환 시)`,

      visualization: {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "장바구니 이탈 고객의 48시간 내 구매 확률 분포",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"시간대": "0-6시간", "초고확률": 561, "고확률": 851, "중고확률": 517, "저확률": 423},
            {"시간대": "6-12시간", "초고확률": 374, "고확률": 567, "중고확률": 344, "저확률": 298},
            {"시간대": "12-24시간", "초고확률": 249, "고확률": 378, "중고확률": 230, "저확률": 234},
            {"시간대": "24-36시간", "초고확률": 124, "고확률": 189, "중고확률": 115, "저확률": 187},
            {"시간대": "36-48시간", "초고확률": 62, "고확률": 95, "중고확률": 57, "저확률": 156}
          ]
        },
        "transform": [
          {
            "fold": ["초고확률", "고확률", "중고확률", "저확률"],
            "as": ["확률그룹", "고객수"]
          }
        ],
        "mark": {"type": "area", "tooltip": true},
        "encoding": {
          "x": {"field": "시간대", "type": "ordinal", "title": "이탈 후 경과 시간"},
          "y": {"field": "고객수", "type": "quantitative", "title": "구매 전환 고객 수"},
          "color": {
            "field": "확률그룹",
            "type": "nominal",
            "scale": {
              "domain": ["초고확률", "고확률", "중고확률", "저확률"],
              "range": ["#dc2626", "#ea580c", "#d97706", "#94a3b8"]
            },
            "legend": {"title": "구매 확률 그룹"}
          }
        }
      },

      data: [
        {
          "probabilityGroup": "초고확률 (85-95%)",
          "customerCount": 1247,
          "avgCartValue": 127000,
          "conversionRate": 92,
          "expectedRevenue": 145800000
        },
        {
          "probabilityGroup": "고확률 (70-84%)",
          "customerCount": 1891, 
          "avgCartValue": 89000,
          "conversionRate": 76,
          "expectedRevenue": 127900000
        },
        {
          "probabilityGroup": "중고확률 (55-69%)",
          "customerCount": 1148,
          "avgCartValue": 64000,
          "conversionRate": 61,
          "expectedRevenue": 44700000
        }
      ],

      model_status: {
        status: "ready",
        model: "Gradient Boosting + Neural Network Ensemble", 
        type: "classification"
      },

      prediction_basis: "최근 6개월 장바구니 이탈 고객 178,429명의 행동 패턴과 구매 전환 이력 기반 딥러닝 모델"
    }
  },

  {
    id: 'brand-loyalty-analysis',
    title: '브랜드 신뢰도가 높아 재구매로 이어질 확률 큰 브랜드 톱5는 어디야?',
    description: '브랜드별 신뢰도 및 재구매 확률 분석',
    category: '브랜드 분석',
    difficulty: 'expert',
    result: {
      analysis: `## 브랜드 신뢰도 & 재구매 확률 TOP 5 분석

### 🏆 재구매 확률이 가장 높은 브랜드 TOP 5

**분석 기간**: 최근 12개월 구매 데이터
**대상**: 월 평균 거래액 5천만원 이상 브랜드 127개

### 📊 종합 순위 (재구매 확률 × 브랜드 신뢰도 × 매출 기여도)

**1위: 노스페이스 (The North Face)**
- **재구매 확률**: 87.3%
- **브랜드 신뢰도**: 94.2점/100
- **고객 만족도**: 4.7/5.0  
- **매출 기여도**: 12.4%
- **핵심 강점**: 품질 일관성, A/S 만족도 최고
- **주요 고객층**: 20-40대 아웃도어 애호가

**2위: 메종 마르지엘라 (Maison Margiela)**
- **재구매 확률**: 84.1%
- **브랜드 신뢰도**: 91.8점/100
- **고객 만족도**: 4.6/5.0
- **매출 기여도**: 8.9%
- **핵심 강점**: 독창적 디자인, 희소성 가치
- **주요 고객층**: 25-35대 패션 얼리어답터

**3위: 아크테릭스 (Arc'teryx)**
- **재구매 확률**: 82.7%
- **브랜드 신뢰도**: 93.1점/100
- **고객 만족도**: 4.8/5.0
- **매출 기여도**: 6.2%
- **핵심 강점**: 기능성, 내구성 최우수
- **주요 고객층**: 30-45대 고소득층

**4위: 파타고니아 (Patagonia)**
- **재구매 확률**: 81.4%
- **브랜드 신뢰도**: 92.7점/100
- **고객 만족도**: 4.7/5.0
- **매출 기여도**: 4.8%
- **핵심 강점**: 지속가능성, 브랜드 철학
- **주요 고객층**: 25-40대 친환경 지향층

**5위: 스톤아일랜드 (Stone Island)**
- **재구매 확률**: 79.8%
- **브랜드 신뢰도**: 90.3점/100
- **고객 만족도**: 4.5/5.0
- **매출 기여도**: 5.1%
- **핵심 강점**: 혁신적 소재, 테크웨어
- **주요 고객층**: 20-35대 스트릿 패션족

### 🔍 브랜드별 재구매 유도 요인 분석

**품질 중심 브랜드 (노스페이스, 아크테릭스, 파타고니아)**
- 제품 내구성: 평균 3.2년 사용
- 기능성 만족도: 95% 이상
- 가격 대비 가치: 4.4/5.0
- 재구매 주기: 18-24개월

**디자인 중심 브랜드 (메종 마르지엘라, 스톤아일랜드)**
- 디자인 독창성: 4.6/5.0
- 브랜드 정체성: 강함
- 소장 가치: 높음
- 재구매 주기: 6-12개월

### 💡 핵심 인사이트

1. **신뢰도 구성 요소 중요도**
   - 제품 품질 (35%)
   - 브랜드 철학/스토리 (28%)  
   - 고객 서비스 (22%)
   - 가격 합리성 (15%)

2. **재구매 예측 모델 주요 변수**
   - 첫 구매 후 만족도 (가중치 40%)
   - 브랜드 커뮤니티 참여도 (가중치 25%)
   - 가격 민감도 (가중치 20%)
   - 트렌드 부합도 (가중치 15%)

3. **카테고리별 특성**
   - **아웃도어**: 기능성 > 디자인 (재구매율 85%)
   - **럭셔리**: 브랜드 가치 > 가격 (재구매율 72%)
   - **스트릿**: 트렌드 > 내구성 (재구매율 68%)

### 🎯 마케팅 전략 제안

**TOP 5 브랜드 집중 전략**:
1. **VIP 고객 프로그램** 강화
2. **신상품 우선 공개** 혜택
3. **브랜드 스토리텔링** 컨텐츠 확대
4. **커뮤니티 활동** 지원
5. **개인화된 추천** 서비스

**예상 효과**: 재구매율 +12%, 고객 생애 가치 +28% 증대`,

      visualization: {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": "브랜드별 재구매 확률 vs 브랜드 신뢰도",
        "width": 600,
        "height": 400,
        "data": {
          "values": [
            {"브랜드": "노스페이스", "재구매확률": 87.2, "신뢰도": 94.1, "매출기여": 15.3, "만족도": 4.8},
            {"브랜드": "아크테릭스", "재구매확률": 84.6, "신뢰도": 91.7, "매출기여": 8.9, "만족도": 4.7},
            {"브랜드": "파타고니아", "재구매확률": 82.1, "신뢰도": 93.4, "매출기여": 7.1, "만족도": 4.6},
            {"브랜드": "메종마르지엘라", "재구매확률": 79.3, "신뢰도": 87.2, "매출기여": 11.2, "만족도": 4.5},
            {"브랜드": "스톤아일랜드", "재구매확률": 76.8, "신뢰도": 85.1, "매출기여": 9.4, "만족도": 4.4},
            {"브랜드": "몽클레어", "재구매확률": 73.2, "신뢰도": 82.9, "매출기여": 6.7, "만족도": 4.3},
            {"브랜드": "캐나다구스", "재구매확률": 71.9, "신뢰도": 79.6, "매출기여": 5.8, "만족도": 4.2},
            {"브랜드": "골듨구스", "재구매확률": 58.4, "신뢰도": 74.3, "매출기여": 4.1, "만족도": 3.9},
            {"브랜드": "디스퀘어드", "재구매확률": 66.7, "신뢰도": 68.5, "매출기여": 3.9, "만족도": 4.0},
            {"브랜드": "오프화이트", "재구매확률": 62.3, "신뢰도": 71.2, "매출기여": 3.4, "만족도": 3.8},
            {"브랜드": "발렌시아가", "재구매확률": 55.1, "신뢰도": 77.8, "매출기여": 2.8, "만족도": 3.7},
            {"브랜드": "베트멍", "재구매확률": 49.6, "신뢰도": 63.4, "매출기여": 2.1, "만족도": 3.4}
          ]
        },
        "layer": [
          {
            "mark": {"type": "circle", "tooltip": true},
            "encoding": {
              "x": {"field": "신뢰도", "type": "quantitative", "title": "브랜드 신뢰도 (점)"},
              "y": {"field": "재구매확률", "type": "quantitative", "title": "재구매 확률 (%)"},
              "size": {"field": "매출기여", "type": "quantitative", "title": "매출 기여도 (%)", "scale": {"range": [100, 1000]}},
              "color": {
                "condition": {
                  "test": "datum.브랜드 === '노스페이스' || datum.브랜드 === '메종마르지엘라' || datum.브랜드 === '아크테릭스' || datum.브랜드 === '파타고니아' || datum.브랜드 === '스톤아일랜드'",
                  "value": "#f59e0b"
                },
                "value": "#64748b"
              }
            }
          },
          {
            "mark": {"type": "text", "dy": -15, "fontSize": 10, "fontWeight": "bold"},
            "encoding": {
              "x": {"field": "신뢰도", "type": "quantitative"},
              "y": {"field": "재구매확률", "type": "quantitative"},
              "text": {"field": "브랜드", "type": "nominal"},
              "color": {
                "condition": {
                  "test": "datum.브랜드 === '노스페이스' || datum.브랜드 === '메종마르지엘라' || datum.브랜드 === '아크테릭스' || datum.브랜드 === '파타고니아' || datum.브랜드 === '스톤아일랜드'",
                  "value": "#f59e0b"
                },
                "value": "#64748b"
              }
            }
          }
        ]
      },

      data: [
        {
          "rank": 1,
          "brand": "노스페이스",
          "repurchaseRate": 87.3,
          "trustScore": 94.2,
          "satisfaction": 4.7,
          "revenueContribution": 12.4
        },
        {
          "rank": 2,
          "brand": "메종 마르지엘라", 
          "repurchaseRate": 84.1,
          "trustScore": 91.8,
          "satisfaction": 4.6,
          "revenueContribution": 8.9
        },
        {
          "rank": 3,
          "brand": "아크테릭스",
          "repurchaseRate": 82.7,
          "trustScore": 93.1,
          "satisfaction": 4.8,
          "revenueContribution": 6.2
        },
        {
          "rank": 4,
          "brand": "파타고니아",
          "repurchaseRate": 81.4,
          "trustScore": 92.7,
          "satisfaction": 4.7,
          "revenueContribution": 4.8
        },
        {
          "rank": 5,
          "brand": "스톤아일랜드",
          "repurchaseRate": 79.8,
          "trustScore": 90.3,
          "satisfaction": 4.5,
          "revenueContribution": 5.1
        }
      ],

      model_status: {
        status: "ready",
        model: "Multi-factor Analysis (PCA + Clustering)",
        type: "analytical"
      },

      prediction_basis: "12개월간 브랜드별 재구매 이력, 고객 만족도 조사, 브랜드 인지도 설문을 종합한 다변량 분석"
    }
  }
];