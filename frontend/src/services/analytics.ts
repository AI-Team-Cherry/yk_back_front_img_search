import axios from 'axios';
import { Analysis, AnalysisResult, QueryRequest, SharedAnalysis } from '../types';
import { mockAnalysisResponses } from '../mockData/analysisResponses';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Mock 모드 설정
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 토큰을 요청에 자동으로 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 (토큰 만료 처리 등)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 분석 결과 저장
export const saveAnalysis = async (analysisData: {
  query: string;
  result: AnalysisResult;
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}): Promise<Analysis> => {
  try {
    const response = await api.post('/analytics/analyses', {
      query: analysisData.query,
      title: analysisData.title,
      result: analysisData.result,
      tags: analysisData.tags || [],
      description: analysisData.description
    });

    const data = response.data;
    
    // 분석이 저장된 후 isPublic이 true면 즉시 공유
    if (analysisData.isPublic) {
      try {
        await shareAnalysis(data.id, 'analysis');
      } catch (shareError) {
        console.warn('분석 저장은 성공했지만 공유에 실패했습니다:', shareError);
      }
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isPublic: analysisData.isPublic || data.is_shared,
      tags: data.tags,
      title: data.title,
      description: data.description
    };
  } catch (error: any) {
    console.error('Save analysis error:', error);
    throw new Error(error.response?.data?.detail || '분석 저장 중 오류가 발생했습니다.');
  }
};

// 내 분석 목록 조회
export const getMyAnalyses = async (page: number = 1, limit: number = 20): Promise<{
  analyses: Analysis[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    const skip = (page - 1) * limit;
    const response = await api.get(`/analytics/analyses?limit=${limit}&skip=${skip}`);
    
    const analyses = response.data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      query: item.query,
      result: item.result,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      isPublic: item.is_shared,
      tags: item.tags,
      title: item.title,
      description: item.description
    }));

    return {
      analyses,
      total: analyses.length, // TODO: 백엔드에서 총 개수 반환
      page: page,
      totalPages: Math.ceil(analyses.length / limit)
    };
  } catch (error: any) {
    console.error('Get my analyses error:', error);
    throw new Error(error.response?.data?.detail || '분석 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 분석 상세 조회
export const getAnalysisById = async (id: string): Promise<Analysis> => {
  try {
    const response = await api.get(`/analytics/analyses/${id}`);
    const data = response.data;
    
    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isPublic: data.is_shared,
      tags: data.tags,
      title: data.title,
      description: data.description
    };
  } catch (error: any) {
    console.error('Get analysis by ID error:', error);
    throw new Error(error.response?.data?.detail || '분석을 불러오는 중 오류가 발생했습니다.');
  }
};

// 공유 분석 목록 조회
export const getSharedAnalyses = async (
  category?: string,
  search?: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  analyses: SharedAnalysis[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    const skip = (page - 1) * limit;
    let url = `/analytics/shared-analyses?limit=${limit}&skip=${skip}`;
    
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    const response = await api.get(url);
    const data = response.data;

    const analyses = data.analyses.map((item: any) => ({
      id: item.id,
      originalAnalysisId: item.id,
      sharedBy: {
        id: item.shared_by.employeeId,
        employeeId: item.shared_by.employeeId,
        name: item.shared_by.name,
        department: item.shared_by.department,
        role: 'user' as const
      },
      sharedAt: new Date(item.shared_at || item.created_at),
      usageCount: item.usage_count,
      rating: item.rating,
      category: item.category,
      query: item.query,
      title: item.title,
      tags: item.tags
    }));

    return {
      analyses,
      total: data.total,
      page: page,
      totalPages: Math.ceil(data.total / limit)
    };
  } catch (error: any) {
    console.error('Get shared analyses error:', error);
    throw new Error(error.response?.data?.detail || '공유 분석을 불러오는 중 오류가 발생했습니다.');
  }
};

// 분석 공유
export const shareAnalysis = async (analysisId: string, category: string = 'analysis'): Promise<any> => {
  try {
    await api.post(`/analytics/analyses/${analysisId}/share`, {
      analysis_id: analysisId,
      category: category
    });
  } catch (error: any) {
    console.error('Share analysis error:', error);
    throw new Error(error.response?.data?.detail || '분석 공유 중 오류가 발생했습니다.');
  }
};

// 분석 삭제
export const deleteAnalysis = async (id: string): Promise<void> => {
  try {
    await api.delete(`/analytics/analyses/${id}`);
  } catch (error: any) {
    console.error('Delete analysis error:', error);
    throw new Error(error.response?.data?.detail || '분석 삭제 중 오류가 발생했습니다.');
  }
};

// AI 질의 실행 (기존 query API 사용)
export const submitQuery = async (request: QueryRequest): Promise<AnalysisResult> => {
  // Mock 모드일 때는 예시 데이터 반환
  if (USE_MOCK_DATA) {
    console.log('🔵 Mock Mode: 자연어 쿼리 실행', request);
    
    // 2초 지연 후 mock 데이터 반환
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockData = mockAnalysisResponses.naturalLanguageQuery;
    
    return {
      visualization: mockData.visualizations && mockData.visualizations.length > 0 ? mockData.visualizations[0] : null,
      analysis: mockData.ai_analysis?.answer || '상위 3개 브랜드 기준 총매출은 429,990원이며 1위는 메종 마르지엘라 334,990원(점유 78.0%)입니다.\n인사이트: 메종 마르지엘라가 압도적 시장 점유율을 보이며, 프리미엄 브랜드 선호도가 높습니다. 평균 가격은 143,330원으로 고가 제품군이 주를 이룹니다.\n추천사항: (1) 메종 마르지엘라 유사 프리미엄 브랜드 확대 (2) 중가격대 제품 라인업 강화 (3) 유니섹스 제품 비중 확대',
      data: mockData.mongodb_results?.data || [],
      model_status: {
        status: "ready",
        model: "Mock AI Model",
        type: "mockup"
      },
      prediction_basis: mockData.mongodb_results?.summary || 'Mock 데이터 분석 완료',
      raw_response: mockData
    };
  }

  try {
    // 토큰이 있으면 백엔드에서 자동으로 사용자 인증
    const response = await api.post('/query/', {
      query: request.query
    });

    const data = response.data;
    
    return {
      visualization: data.visualizations && data.visualizations.length > 0 ? data.visualizations[0] : null,
      analysis: data.ai_analysis?.answer || data.report?.details?.insights || '분석 결과가 없습니다.',
      data: data.mongodb_results?.data || [],
      model_status: {
        status: data.status === "success" ? "ready" : "error",
        model: "Cherry Back AI",
        type: "integrated"
      },
      prediction_basis: data.mongodb_results?.summary || '쿼리 분석 완료',
      raw_response: data
    };
  } catch (error: any) {
    console.error('Query submission error:', error);
    
    return {
      visualization: null,
      analysis: `쿼리 처리 중 오류가 발생했습니다: ${error.response?.data?.detail || error.message}`,
      data: [],
      model_status: {
        status: "error",
        model: "Cherry Back AI",
        type: "local"
      },
      prediction_basis: "오류로 인해 분석을 완료할 수 없습니다."
    };
  }
};

// 기존 로컬 스토리지 기반 함수들 (호환성 유지)
export const updateAnalysis = async (id: string, updates: Partial<Analysis>): Promise<Analysis> => {
  // TODO: 백엔드 API가 구현되면 교체
  console.warn('updateAnalysis: 아직 백엔드 API가 구현되지 않았습니다.');
  return getAnalysisById(id);
};

export const applySharedAnalysis = async (sharedAnalysisId: string): Promise<Analysis> => {
  // TODO: 백엔드 API가 구현되면 교체
  console.warn('applySharedAnalysis: 아직 백엔드 API가 구현되지 않았습니다.');
  return getAnalysisById(sharedAnalysisId);
};

export const getDashboardStats = async (): Promise<any> => {
  // TODO: 백엔드 API가 구현되면 교체
  return {
    user_stats: {
      total_analyses: 0,
      shared_analyses: 0,
      department: 'Unknown',
      role: 'analyst'
    },
    recent_analyses: [],
    popular_analyses: []
  };
};

export const getSchemaInfo = async (): Promise<any> => {
  return {
    collections: [
      {
        name: 'sales',
        fields: ['date', 'amount', 'product_id', 'customer_id']
      },
      {
        name: 'customers',
        fields: ['id', 'name', 'email', 'age', 'region']
      },
      {
        name: 'products',
        fields: ['id', 'name', 'category', 'price', 'stock']
      }
    ]
  };
};

export const getQuerySuggestions = async (): Promise<string[]> => {
  return [
    '신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘',
    '이탈 위험 높은데 쿠폰 주면 돌아올 확률 큰 고객만 골라줘',
    '이번 주에 상의/하의 각 5% 가격 인하하면 예측 판매량이 얼마나 늘까?',
    '장바구니에 담고 나간 사람 중 48시간 내 결제할 가능성 높은 사용자만 알려줘',
    '브랜드 신뢰도가 높아 재구매로 이어질 확률 큰 브랜드 톱5는 어디야?'
  ];
};

export const refreshSchema = async (): Promise<any> => {
  return {
    message: '스키마가 성공적으로 새로고침되었습니다.',
    timestamp: new Date().toISOString()
  };
};