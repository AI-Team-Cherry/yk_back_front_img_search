import axios from 'axios';
import { mockAnalysisResponses, simulateAnalysisProgress } from '../mockData/analysisResponses';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Mock 모드 설정
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

// API 클라이언트 설정
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ML 분석 요청 타입
export interface MLAnalysisRequest {
  analysis_type: 'clustering' | 'prediction' | 'timeseries' | 'anomaly' | 'segmentation';
  collection_name: string;
  parameters?: Record<string, any>;
  save_analysis?: boolean;
  tags?: string[];
}

// ML 분석 결과 타입
export interface MLAnalysisResult {
  id?: string;
  analysis_type: string;
  collection: string;
  data_count: number;
  ml_result: {
    analysis_type: string;
    [key: string]: any;
  };
  visualizations: Array<{
    mark: any;
    data: any;
    encoding: any;
    title: string;
    width: number;
    height: number;
  }>;
  created_at: string;
}

// ML 분석 방법 타입
export interface MLMethod {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    default?: any;
    description: string;
    options?: string[];
  }>;
}

// ML 컬렉션 정보 타입
export interface MLCollection {
  name: string;
  document_count: number;
  numeric_fields: string[];
  sample_fields: string[];
}

// ML 분석 서비스
class MLAnalyticsService {
  /**
   * ML 분석 실행
   */
  async performAnalysis(request: MLAnalysisRequest): Promise<MLAnalysisResult> {
    // Mock 모드일 때는 예시 데이터 반환
    if (USE_MOCK_DATA) {
      console.log('🔵 Mock Mode: ML 분석 실행', request);
      
      // 3초 지연 후 mock 데이터 반환
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 분석 유형에 따른 mock 데이터 생성
      const mockResult: MLAnalysisResult = {
        id: 'ml_' + Date.now(),
        analysis_type: request.analysis_type,
        collection: request.collection_name,
        data_count: 1000,
        ml_result: {
          analysis_type: request.analysis_type,
          n_clusters: 5,
          silhouette_score: 0.85,
          cluster_sizes: [200, 150, 300, 250, 100],
          insights: [
            '고객을 5개 그룹으로 분류했습니다.',
            'VIP 고객 그룹(300명)이 가장 큰 매출을 기여합니다.',
            '프리미엄 그룹(250명)은 재구매율이 가장 높습니다.'
          ],
          recommendations: [
            'VIP 고객을 위한 맞춤형 프로모션 기획',
            '일반 고객을 프리미엄으로 업그레이드하는 전략 수립',
            '침체 그룹을 위한 재활성화 프로그램 운영'
          ]
        },
        visualizations: [{
          mark: { type: 'bar', tooltip: true },
          data: {
            values: [
              { cluster: '프리미엄 고객', count: 250, avgPurchase: 450000 },
              { cluster: 'VIP 고객', count: 300, avgPurchase: 1200000 },
              { cluster: '일반 고객', count: 200, avgPurchase: 150000 },
              { cluster: '신규 고객', count: 150, avgPurchase: 80000 },
              { cluster: '침체 고객', count: 100, avgPurchase: 30000 }
            ]
          },
          encoding: {
            x: { field: 'cluster', type: 'nominal', title: '고객 그룹' },
            y: { field: 'count', type: 'quantitative', title: '고객 수' },
            color: { field: 'avgPurchase', type: 'quantitative', title: '평균 구매 금액' }
          },
          title: '고객 그룹별 분포',
          width: 500,
          height: 300
        }],
        created_at: new Date().toISOString()
      };
      
      return mockResult;
    }
    
    try {
      const response = await api.post('/ml/analyze', request);
      return response.data;
    } catch (error: any) {
      console.error('ML 분석 오류:', error);
      throw new Error(
        error.response?.data?.detail || 'ML 분석 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 지원하는 ML 분석 방법 목록 조회
   */
  async getMLMethods(): Promise<Record<string, MLMethod>> {
    try {
      const response = await api.get('/ml/methods');
      return response.data.methods;
    } catch (error: any) {
      console.error('ML 방법 목록 조회 오류:', error);
      throw new Error(
        error.response?.data?.detail || 'ML 방법 목록을 가져오는 중 오류가 발생했습니다.'
      );
    }
  }

  /**
   * ML 분석 가능한 컬렉션 목록 조회
   */
  async getMLCollections(): Promise<MLCollection[]> {
    // cherry_back에는 별도의 collections API가 없으므로 기본 컬렉션 목록 반환
    return [
      {
        name: 'sales',
        document_count: 10000,
        numeric_fields: ['amount', 'quantity', 'price'],
        sample_fields: ['date', 'product_id', 'customer_id']
      },
      {
        name: 'customers',
        document_count: 5000,
        numeric_fields: ['age', 'purchase_count', 'total_spent'],
        sample_fields: ['name', 'email', 'region']
      },
      {
        name: 'products',
        document_count: 1000,
        numeric_fields: ['price', 'stock', 'rating'],
        sample_fields: ['name', 'category', 'brand']
      },
      {
        name: 'reviews',
        document_count: 20000,
        numeric_fields: ['rating', 'helpful_count'],
        sample_fields: ['text', 'product_id', 'created_at']
      }
    ];
  }

  /**
   * 고객 클러스터링 분석
   */
  async performClustering(
    collectionName: string,
    nClusters: number = 5,
    sampleSize: number = 1000
  ): Promise<MLAnalysisResult> {
    return this.performAnalysis({
      analysis_type: 'clustering',
      collection_name: collectionName,
      parameters: {
        n_clusters: nClusters,
        sample_size: sampleSize,
      },
      tags: ['clustering', 'customer-segmentation'],
    });
  }

  /**
   * 매출 예측 분석
   */
  async performPrediction(
    collectionName: string,
    targetCol?: string,
    daysAhead: number = 30,
    sampleSize: number = 1000
  ): Promise<MLAnalysisResult> {
    const parameters: Record<string, any> = {
      days_ahead: daysAhead,
      sample_size: sampleSize,
    };
    
    if (targetCol) {
      parameters.target_col = targetCol;
    }

    return this.performAnalysis({
      analysis_type: 'prediction',
      collection_name: collectionName,
      parameters,
      tags: ['prediction', 'sales-forecast'],
    });
  }

  /**
   * 시계열 분석
   */
  async performTimeSeriesAnalysis(
    collectionName: string,
    dateCol?: string,
    valueCol?: string,
    sampleSize: number = 1000
  ): Promise<MLAnalysisResult> {
    const parameters: Record<string, any> = {
      sample_size: sampleSize,
    };
    
    if (dateCol) {
      parameters.date_col = dateCol;
    }
    
    if (valueCol) {
      parameters.value_col = valueCol;
    }

    return this.performAnalysis({
      analysis_type: 'timeseries',
      collection_name: collectionName,
      parameters,
      tags: ['timeseries', 'trend-analysis'],
    });
  }

  /**
   * 이상치 탐지 분석
   */
  async performAnomalyDetection(
    collectionName: string,
    method: 'isolation' | 'statistical' = 'isolation',
    sampleSize: number = 1000
  ): Promise<MLAnalysisResult> {
    return this.performAnalysis({
      analysis_type: 'anomaly',
      collection_name: collectionName,
      parameters: {
        method,
        sample_size: sampleSize,
      },
      tags: ['anomaly-detection', 'outliers'],
    });
  }

  /**
   * 분석 결과 해석 도우미
   */
  interpretResult(result: MLAnalysisResult): {
    summary: string;
    insights: string[];
    recommendations: string[];
  } {
    const { analysis_type, ml_result } = result;
    
    switch (analysis_type) {
      case 'clustering':
        return {
          summary: `${ml_result.n_clusters}개 고객 그룹으로 세분화되었습니다. 실루엣 점수: ${ml_result.silhouette_score?.toFixed(2)}`,
          insights: ml_result.insights || [],
          recommendations: ml_result.recommendations || [],
        };
      
      case 'prediction':
        return {
          summary: `매출 예측 모델의 정확도: ${ml_result.model_performance?.accuracy_percentage?.toFixed(1)}%`,
          insights: ml_result.insights || [],
          recommendations: ml_result.recommendations || [],
        };
      
      case 'timeseries':
        return {
          summary: `${ml_result.date_range?.days || 0}일간의 시계열 분석 완료. 트렌드: ${ml_result.trend?.direction || 'unknown'}`,
          insights: ml_result.insights || [],
          recommendations: ml_result.recommendations || [],
        };
      
      case 'anomaly':
        return {
          summary: `전체 데이터의 ${ml_result.anomaly_rate?.toFixed(1)}%에서 이상치가 발견되었습니다.`,
          insights: ml_result.insights || [],
          recommendations: ml_result.recommendations || [],
        };
      
      default:
        return {
          summary: '분석이 완료되었습니다.',
          insights: ml_result.insights || [],
          recommendations: ml_result.recommendations || [],
        };
    }
  }

  /**
   * 분석 유형별 추천 매개변수
   */
  getRecommendedParameters(analysisType: string, collectionInfo: MLCollection): Record<string, any> {
    switch (analysisType) {
      case 'clustering':
        const estimatedClusters = Math.min(Math.max(Math.floor(Math.sqrt(collectionInfo.document_count / 100)), 3), 10);
        return {
          n_clusters: estimatedClusters,
          sample_size: Math.min(collectionInfo.document_count, 1000),
        };
      
      case 'prediction':
        return {
          target_col: collectionInfo.numeric_fields[0] || 'total_amount',
          days_ahead: 30,
          sample_size: Math.min(collectionInfo.document_count, 1000),
        };
      
      case 'timeseries':
        return {
          date_col: 'created_at',
          value_col: collectionInfo.numeric_fields[0] || 'total_amount',
          sample_size: Math.min(collectionInfo.document_count, 2000),
        };
      
      case 'anomaly':
        return {
          method: 'isolation',
          sample_size: Math.min(collectionInfo.document_count, 1000),
        };
      
      default:
        return {};
    }
  }
}

export const mlAnalyticsService = new MLAnalyticsService();
export default mlAnalyticsService;