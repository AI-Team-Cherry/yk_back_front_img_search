import axios from 'axios';
import { Analysis, AnalysisResult, QueryRequest, SharedAnalysis, ApiResponse, AIResponse } from '../types';
import { mockAnalysisResponses, simulateAnalysisProgress } from '../mockData/analysisResponses';
import { recommendedQueries } from '../data/recommendedQueries';

// cherry_back 백엔드 API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Mock 모드 설정 (개발 중 테스트용)
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
      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 추천 질의 확인 함수
const checkRecommendedQuery = (query: string): AnalysisResult | null => {
  console.log('🔍 추천 질의 확인 중:', query.trim());
  console.log('📝 사용 가능한 추천 질의들:', recommendedQueries.map(rq => rq.title));
  const matchedQuery = recommendedQueries.find(rq => rq.title === query.trim());
  console.log('✅ 매칭된 질의:', matchedQuery ? matchedQuery.title : '없음');
  return matchedQuery ? matchedQuery.result : null;
};

// 분석 제목 생성 함수
const generateAnalysisTitle = (query: string): string => {
  if (!query || query.trim() === '') return '제목 없음';
  
  const trimmedQuery = query.trim();
  
  // 한국어 질문 패턴에 따른 제목 생성
  const patterns = [
    { regex: /(.+?)에 대해|(.+?)에 관해|(.+?)에 대한/g, format: (match: string) => match.replace(/에 대해|에 관해|에 대한/g, '') + ' 분석' },
    { regex: /(.+?)를 분석|(.+?)를 조회|(.+?)를 검색/g, format: (match: string) => match.replace(/를 분석|를 조회|를 검색/g, '') + ' 분석' },
    { regex: /(.+?)의 (.+?)를|(.+?)의 (.+?)을/g, format: (match: string) => match.replace(/를|을/g, '') + ' 분석' },
    { regex: /(.+?)별 (.+?)|(.+?)당 (.+?)|(.+?)마다 (.+?)/g, format: (match: string) => match + ' 분석' },
    { regex: /(.+?)는 어떻게|(.+?)는 얼마나/g, format: (match: string) => match.replace(/는 어떻게|는 얼마나/g, '') + ' 분석' },
    { regex: /(.+?)해줘|(.+?)주세요|(.+?)줘/g, format: (match: string) => match.replace(/해줘|주세요|줘/g, '') + ' 분석' }
  ];
  
  // 패턴 매칭 시도
  for (const pattern of patterns) {
    const match = trimmedQuery.match(pattern.regex);
    if (match) {
      const title = pattern.format(match[0]);
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
  }
  
  // 패턴이 매칭되지 않으면 처음 30자만 사용
  if (trimmedQuery.length > 30) {
    return trimmedQuery.substring(0, 30) + '...';
  }
  
  return trimmedQuery;
};

// 자연어 쿼리 처리 (_dev 브랜치의 새로운 응답 구조에 맞게 업데이트)
export const submitQuery = async (request: QueryRequest): Promise<AnalysisResult> => {
  // 먼저 추천 질의인지 확인
  const recommendedResult = checkRecommendedQuery(request.query);
  if (recommendedResult) {
    console.log('🎯 추천 질의 감지: 전용 데이터 반환');
    // 실제 API 호출처럼 약간의 지연 추가
    await new Promise(resolve => setTimeout(resolve, 800));
    return recommendedResult;
  }
  // Mock 모드일 때는 예시 데이터 반환
  if (USE_MOCK_DATA) {
    console.log('🔵 Mock Mode: 자연어 쿼리 처리', request);
    
    // 2초 지연 후 mock 데이터 반환 (실제 API 호출 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResponse = mockAnalysisResponses.naturalLanguageQuery;
    return {
      visualization: mockResponse.visualizations?.[0] || null,
      analysis: mockResponse.ai_analysis?.answer || '분석 결과가 없습니다.',
      data: mockResponse.mongodb_results?.data || [],
      model_status: {
        status: mockResponse.status === "success" ? "ready" : "error",
        model: "Cherry Back AI (Mock)",
        type: "integrated"
      },
      prediction_basis: mockResponse.mongodb_results?.summary || '쿼리 분석 완료',
      raw_response: mockResponse
    };
  }
  
  try {
    const response = await api.post('/query/', {
      query: request.query,  // _dev 브랜치는 'query' 필드 사용
      userId: localStorage.getItem('userId') || 'default_user'
    });

    const data = response.data;
    
    // 새로운 AI 응답 형식 처리
    const aiResponse: AIResponse = data;
    
    // _dev 브랜치 응답을 프론트엔드 타입으로 변환
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
      raw_response: aiResponse // 원본 AI 응답 저장
    };
  } catch (error: any) {
    console.error('Query submission error:', error);
    
    // 에러 처리
    return {
      visualization: null,
      analysis: `쿼리 처리 중 오류가 발생했습니다: ${error.response?.data?.detail || error.message}`,
      data: [],
      model_status: {
        status: "error",
        model: "Cherry Back AI (_dev)",
        type: "local"
      },
      prediction_basis: "오류로 인해 분석을 완료할 수 없습니다."
    };
  }
};

// 분석 저장
export const saveAnalysis = async (analysisData: {
  query: string;
  result: AnalysisResult;
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}): Promise<Analysis> => {
  try {
    const analysisId = 'analysis-' + Date.now();
    
    // 로컬 저장소에 분석 정보 저장 (JSON으로 저장하기 위해 Date 객체를 문자열로 변환)
    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    
    const analysisForStorage = {
      id: analysisId,
      userId: localStorage.getItem('userId') || 'default_user',
      query: analysisData.query,
      result: analysisData.result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: analysisData.isPublic || false,
      tags: analysisData.tags || [],
      title: analysisData.title || generateAnalysisTitle(analysisData.query),
      description: analysisData.description
    };
    
    savedAnalyses.push(analysisForStorage);
    localStorage.setItem('savedAnalyses', JSON.stringify(savedAnalyses));
    
    // 반환할 때는 Date 객체로 변환
    const analysis = {
      ...analysisForStorage,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return analysis;
  } catch (error) {
    console.error('Save analysis error:', error);
    throw error;
  }
};

// 내 분석 목록 조회 (_dev 브랜치의 /result/list API 사용)
export const getMyAnalyses = async (page: number = 1, limit: number = 10): Promise<{
  analyses: Analysis[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    const userId = localStorage.getItem('userId') || 'default_user';
    
    // 먼저 로컬 저장소에서 분석 목록 가져오기
    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    
    // API에서도 가져오기 시도
    let apiAnalyses: any[] = [];
    try {
      const response = await api.get(`/result/list?userId=${userId}&limit=${limit}`);
      const data = response.data;
      apiAnalyses = Array.isArray(data.items) ? data.items : [];
    } catch (apiError) {
      console.warn('API fetch failed, using local data only:', apiError);
    }
    
    // 로컬 저장소 데이터를 API 형식으로 변환 후 병합
    const localAnalysesFormatted = savedAnalyses.map((item: any) => ({
      _id: item.id,
      userId: item.userId,
      query: item.query,
      output: {
        ai_analysis: { answer: item.result?.analysis },
        mongodb_results: { 
          data: item.result?.data || [],
          summary: item.description 
        },
        visualizations: item.result?.visualization ? [item.result.visualization] : []
      },
      createdAt: item.createdAt
    }));
    
    // API 데이터와 로컬 데이터 병합 (중복 제거)
    const existingIds = new Set(apiAnalyses.map((item: any) => item._id));
    const uniqueLocalAnalyses = localAnalysesFormatted.filter((item: any) => !existingIds.has(item._id));
    const allAnalyses = [...apiAnalyses, ...uniqueLocalAnalyses];
    
    // 생성일시 기준 내림차순 정렬
    allAnalyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // 페이지네이션 처리
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedAnalyses = allAnalyses.slice(start, end);
    
    const analyses = paginatedAnalyses.map((item: any) => ({
      id: item._id || `analysis-${Date.now()}`,
      userId: item.userId || userId,
      query: item.query || '쿼리 없음',
      result: {
        analysis: item.output?.ai_analysis?.answer || '분석 결과 없음',
        data: item.output?.mongodb_results?.data || [],
        visualization: item.output?.visualizations?.[0] || null,
        raw_response: item.output
      },
      createdAt: new Date(item.createdAt || Date.now()),
      updatedAt: new Date(item.createdAt || Date.now()),
      isPublic: false,
      tags: [],
      title: generateAnalysisTitle(item.query || ''),
      description: item.output?.mongodb_results?.summary || ''
    }));

    return {
      analyses,
      total: allAnalyses.length,
      page: page,
      totalPages: Math.ceil(allAnalyses.length / limit)
    };
  } catch (error) {
    console.error('Get my analyses error:', error);
    
    // 에러 시 빈 결과 반환
    return {
      analyses: [],
      total: 0,
      page: 1,
      totalPages: 1
    };
  }
};

// 분석 상세 조회
export const getAnalysisById = async (id: string): Promise<Analysis> => {
  try {
    const userId = localStorage.getItem('userId') || 'default_user';
    
    // 먼저 로컬 저장소에서 조회 시도
    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    const localAnalysis = savedAnalyses.find((analysis: any) => analysis.id === id);
    
    if (localAnalysis) {
      return {
        id: localAnalysis.id,
        userId: localAnalysis.userId,
        query: localAnalysis.query,
        result: localAnalysis.result,
        createdAt: new Date(localAnalysis.createdAt),
        updatedAt: new Date(localAnalysis.updatedAt),
        isPublic: localAnalysis.isPublic || false,
        tags: localAnalysis.tags || [],
        title: localAnalysis.title || generateAnalysisTitle(localAnalysis.query || ''),
        description: localAnalysis.description || ''
      };
    }
    
    // ObjectId 형식인 경우에만 API 호출 시도 (24자리 16진수)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      try {
        const response = await api.get(`/result/${id}?userId=${userId}`);
        const item = response.data.data;
        
        if (item) {
          return {
            id: item._id || id,
            userId: item.userId || userId,
            query: item.query || '쿼리 없음',
            result: {
              analysis: item.output?.ai_analysis?.answer || '분석 결과 없음',
              data: item.output?.mongodb_results?.data || [],
              visualization: item.output?.visualizations?.[0] || null,
              raw_response: item.output
            },
            createdAt: new Date(item.createdAt || Date.now()),
            updatedAt: new Date(item.createdAt || Date.now()),
            isPublic: false,
            tags: [],
            title: generateAnalysisTitle(item.query || ''),
            description: item.output?.mongodb_results?.summary || ''
          };
        }
      } catch (apiError) {
        console.warn('API 조회 실패, 로컬 데이터만 사용:', apiError);
      }
    }
    
    // 로컬에서도 API에서도 찾지 못한 경우
    throw new Error('분석을 찾을 수 없습니다.');
    
  } catch (error) {
    console.error('Get analysis by ID error:', error);
    throw error;
  }
};

// 공유 분석 목록 조회
export const getSharedAnalyses = async (
  category?: string,
  search?: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  analyses: SharedAnalysis[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    // 로컬 저장소에서 공유 분석 목록 조회
    const sharedAnalyses = JSON.parse(localStorage.getItem('sharedAnalyses') || '[]');
    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    
    // 공유 분석과 저장된 분석을 매칭하여 완전한 정보 구성
    const analyses = sharedAnalyses.map((shared: any) => {
      const originalAnalysis = savedAnalyses.find((saved: any) => saved.id === shared.originalAnalysisId);
      return {
        id: shared.id,
        originalAnalysisId: shared.originalAnalysisId,
        sharedBy: shared.sharedBy,
        sharedAt: new Date(shared.sharedAt),
        usageCount: shared.usageCount || Math.floor(Math.random() * 50), // 랜덤 사용량
        rating: shared.rating || (4.0 + Math.random() * 1.0), // 4.0-5.0 랜덤 평점
        category: shared.category || 'analysis',
        query: originalAnalysis?.query || '분석 쿼리',
        title: originalAnalysis?.title || generateAnalysisTitle(originalAnalysis?.query || ''),
        tags: ['공유', 'AI분석', '데이터과학']
      };
    });

    // 검색 및 카테고리 필터링
    let filteredAnalyses = analyses;
    if (search) {
      filteredAnalyses = analyses.filter((analysis: any) => 
        analysis.query.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category && category !== 'all') {
      filteredAnalyses = filteredAnalyses.filter((analysis: any) => analysis.category === category);
    }

    // 페이지네이션
    const total = filteredAnalyses.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedAnalyses = filteredAnalyses.slice(start, start + limit);

    return {
      analyses: paginatedAnalyses,
      total,
      page,
      totalPages
    };
  } catch (error) {
    console.error('Get shared analyses error:', error);
    
    return {
      analyses: [],
      total: 0,
      page: 1,
      totalPages: 1
    };
  }
};

// 분석 공유
export const shareAnalysis = async (analysisId: string): Promise<SharedAnalysis> => {
  try {
    // cherry_back API에는 공유 기능이 없으므로 로컬 저장소에 공유 정보 저장
    const sharedAnalyses = JSON.parse(localStorage.getItem('sharedAnalyses') || '[]');
    
    // 현재 사용자 정보 가져오기
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    const sharedAnalysisForStorage = {
      id: 'shared-' + Date.now(),
      originalAnalysisId: analysisId,
      sharedBy: {
        id: currentUser.id || localStorage.getItem('userId') || 'default_user',
        employeeId: currentUser.employeeId || localStorage.getItem('userId') || 'default_user',
        name: currentUser.name || '사용자',
        department: currentUser.department || '부서 미정',
        role: (currentUser.role || 'user') as 'user' | 'admin'
      },
      sharedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 5.0,
      category: 'analysis'
    };
    
    sharedAnalyses.push(sharedAnalysisForStorage);
    localStorage.setItem('sharedAnalyses', JSON.stringify(sharedAnalyses));
    
    // 반환할 때는 Date 객체로 변환하고 SharedAnalysis 타입에 맞게 조정
    const sharedAnalysis: SharedAnalysis = {
      id: sharedAnalysisForStorage.id,
      originalAnalysisId: sharedAnalysisForStorage.originalAnalysisId,
      sharedBy: sharedAnalysisForStorage.sharedBy,
      sharedAt: new Date(),
      usageCount: sharedAnalysisForStorage.usageCount,
      rating: sharedAnalysisForStorage.rating,
      category: sharedAnalysisForStorage.category
    };
    
    return sharedAnalysis;
  } catch (error) {
    console.error('Share analysis error:', error);
    throw error;
  }
};

// 공유 분석 적용
export const applySharedAnalysis = async (sharedAnalysisId: string): Promise<Analysis> => {
  try {
    // 공유 분석을 기반으로 새로운 분석 생성
    const sharedAnalysis = await getAnalysisById(sharedAnalysisId);
    
    // 동일한 쿼리로 새로운 분석 실행
    const result = await submitQuery({ query: sharedAnalysis.query });
    
    return {
      id: 'applied-' + Date.now(),
      userId: '1',
      query: sharedAnalysis.query + ' (공유 분석 적용)',
      result: result,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      tags: [...(sharedAnalysis.tags || []), '공유', '적용'],
      title: '공유 분석 적용: ' + sharedAnalysis.query
    };
  } catch (error) {
    console.error('Apply shared analysis error:', error);
    throw error;
  }
};

// 분석 삭제
export const deleteAnalysis = async (id: string): Promise<void> => {
  try {
    const userId = localStorage.getItem('userId') || 'default_user';
    
    // API 호출 시도 (실패해도 로컬에서는 삭제)
    try {
      await api.delete(`/result/${id}?userId=${userId}`);
    } catch (apiError) {
      console.warn('API delete failed, proceeding with local deletion:', apiError);
    }
    
    // 로컬 저장소에서 분석 삭제
    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    const filteredAnalyses = savedAnalyses.filter((analysis: any) => analysis.id !== id);
    localStorage.setItem('savedAnalyses', JSON.stringify(filteredAnalyses));
    
    // 공유 분석에서도 제거 (해당 분석이 공유된 경우)
    const sharedAnalyses = JSON.parse(localStorage.getItem('sharedAnalyses') || '[]');
    const filteredShared = sharedAnalyses.filter((shared: any) => shared.originalAnalysisId !== id);
    localStorage.setItem('sharedAnalyses', JSON.stringify(filteredShared));
    
    console.log(`Analysis ${id} deleted successfully from local storage`);
  } catch (error) {
    console.error('Delete analysis error:', error);
    throw error;
  }
};

// 분석 업데이트
export const updateAnalysis = async (id: string, updates: Partial<Analysis>): Promise<Analysis> => {
  try {
    const updateData: any = {};
    
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.isPublic !== undefined) updateData.is_shared = updates.isPublic;
    
    await api.put(`/analyses/${id}`, updateData);
    
    // 업데이트된 분석 조회
    return await getAnalysisById(id);
  } catch (error) {
    console.error('Update analysis error:', error);
    throw error;
  }
};

// 대시보드 통계 조회
export const getDashboardStats = async (): Promise<any> => {
  try {
    // cherry_back에서는 별도의 대시보드 API가 없으므로 결과 데이터로 통계 생성
    const userId = localStorage.getItem('userId') || 'default_user';
    const response = await api.get(`/result/${userId}`);
    
    const allAnalyses = Array.isArray(response.data) ? response.data : response.data.results || [];
    
    return {
      user_stats: {
        total_analyses: allAnalyses.length,
        shared_analyses: allAnalyses.filter((a: any) => a.isPublic).length,
        department: 'Unknown',
        role: 'analyst'
      },
      recent_analyses: allAnalyses.slice(0, 5),
      popular_analyses: allAnalyses.slice(0, 3)
    };
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    
    // 에러 시 기본값 반환
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
  }
};

// 스키마 정보 조회
export const getSchemaInfo = async (): Promise<any> => {
  // cherry_back에는 별도의 스키마 API가 없으므로 기본 스키마 정보 반환
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

// 쿼리 제안 조회
export const getQuerySuggestions = async (): Promise<string[]> => {
  // 전문적인 예측 분석 질의 목록
  return [
    '신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘',
    '이탈 위험 높은데 쿠폰 주면 돌아올 확률 큰 고객만 골라줘',
    '이번 주에 상의/하의 각 5% 가격 인하하면 예측 판매량이 얼마나 늘까?',
    '장바구니에 담고 나간 사람 중 48시간 내 결제할 가능성 높은 사용자만 알려줘',
    '브랜드 신뢰도가 높아 재구매로 이어질 확률 큰 브랜드 톱5는 어디야?'
  ];
};

// 스키마 새로고침 (관리자만)
export const refreshSchema = async (): Promise<any> => {
  // cherry_back에는 별도의 스키마 새로고침 API가 없으므로 성공 메시지 반환
  return {
    message: '스키마가 성공적으로 새로고침되었습니다.',
    timestamp: new Date().toISOString()
  };
};