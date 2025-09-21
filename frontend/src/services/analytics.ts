import { Analysis, AnalysisResult, QueryRequest, SharedAnalysis } from '../types';
import { getApiClient } from './apiClient';

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
    const api = await getApiClient();
    const response = await api.post('/api/analytics/analyses', {
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
      isPublic: data.is_public || false,
      tags: data.tags || [],
      title: data.title,
      description: data.description
    };
  } catch (error: any) {
    console.error('분석 저장 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 저장에 실패했습니다.');
  }
};

// 사용자의 분석 목록 조회
export const getUserAnalyses = async (): Promise<{ analyses: Analysis[]; total: number }> => {
  try {
    const api = await getApiClient();
    const response = await api.get('/api/analytics/analyses');

    // API가 배열을 직접 반환하는 경우
    if (Array.isArray(response.data)) {
      const analyses = response.data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        query: item.query,
        result: item.result,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        isPublic: item.is_public || false,
        tags: item.tags || [],
        title: item.title,
        description: item.description
      }));
      return { analyses, total: analyses.length };
    }

    // API가 객체를 반환하는 경우
    const analyses = (response.data.analyses || response.data.items || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      query: item.query,
      result: item.result,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      isPublic: item.is_public || false,
      tags: item.tags || [],
      title: item.title,
      description: item.description
    }));

    return {
      analyses,
      total: response.data.total || analyses.length
    };
  } catch (error: any) {
    console.error('분석 목록 조회 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 목록 조회에 실패했습니다.');
  }
};

// 특정 분석 조회
export const getAnalysis = async (analysisId: string): Promise<Analysis> => {
  try {
    const api = await getApiClient();
    const response = await api.get(`/api/analytics/analyses/${analysisId}`);
    const data = response.data;

    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isPublic: data.is_public || false,
      tags: data.tags || [],
      title: data.title,
      description: data.description
    };
  } catch (error: any) {
    console.error('분석 조회 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 조회에 실패했습니다.');
  }
};

// 분석 삭제
export const deleteAnalysis = async (analysisId: string): Promise<void> => {
  try {
    const api = await getApiClient();
    await api.delete(`/api/analytics/analyses/${analysisId}`);
  } catch (error: any) {
    console.error('분석 삭제 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 삭제에 실패했습니다.');
  }
};

// 분석 공유
export const shareAnalysis = async (analysisId: string, shareType: 'link' | 'analysis' = 'link'): Promise<string> => {
  try {
    const api = await getApiClient();
    const response = await api.post(`/api/analytics/analyses/${analysisId}/share`, {
      share_type: shareType
    });
    return response.data.share_url || response.data.share_id;
  } catch (error: any) {
    console.error('분석 공유 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 공유에 실패했습니다.');
  }
};

// 공유된 분석 목록 조회
export const getSharedAnalyses = async (
  category?: string,
  search?: string,
  page?: number,
  limit?: number
): Promise<{ analyses: SharedAnalysis[]; total: number }> => {
  try {
    const api = await getApiClient();
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await api.get(`/api/analytics/shared?${params.toString()}`);

    const mapSharedAnalysis = (item: any): SharedAnalysis => {
      const mappedAnalysis = item.analysis ? {
        id: item.analysis.id,
        userId: item.analysis.user_id,
        query: item.analysis.query,
        result: item.analysis.result,
        createdAt: new Date(item.analysis.created_at),
        updatedAt: new Date(item.analysis.updated_at),
        isPublic: item.analysis.is_public || false,
        tags: item.analysis.tags || [],
        title: item.analysis.title,
        description: item.analysis.description
      } : undefined;

      return {
        // 새로운 API 응답 필드들
        id: item.id,
        analysisId: item.analysis_id,
        shareId: item.share_id,
        shareUrl: item.share_url,
        createdAt: new Date(item.created_at),
        accessCount: item.access_count || 0,
        analysis: mappedAnalysis,

        // 호환성 필드들 (분석 데이터에서 추출하거나 기본값)
        originalAnalysisId: item.analysis_id || item.id,
        sharedAt: new Date(item.created_at),
        usageCount: item.access_count || 0,
        rating: item.rating || 0,
        category: item.category || 'general',
        query: mappedAnalysis?.query || '',
        title: mappedAnalysis?.title || '',
        tags: mappedAnalysis?.tags || [],
        // sharedBy는 기본 사용자 객체 제공
        sharedBy: item.shared_by || {
          id: 'unknown',
          employeeId: 'unknown',
          name: 'Unknown User',
          department: 'Unknown',
          role: 'user' as const
        }
      };
    };

    // API가 배열을 직접 반환하는 경우 처리
    if (Array.isArray(response.data)) {
      const analyses = response.data.map(mapSharedAnalysis);
      return { analyses, total: analyses.length };
    }

    // API가 객체를 반환하는 경우 처리
    const analyses = (response.data.analyses || response.data.items || []).map(mapSharedAnalysis);

    return {
      analyses,
      total: response.data.total || analyses.length
    };
  } catch (error: any) {
    console.error('공유 분석 목록 조회 오류:', error);
    throw new Error(error.response?.data?.detail || '공유 분석 목록 조회에 실패했습니다.');
  }
};

// 데이터 분석 실행
export const runAnalysis = async (request: QueryRequest): Promise<AnalysisResult> => {
  try {
    const api = await getApiClient();
    const response = await api.post('/api/analytics/analyze', request);
    return response.data;
  } catch (error: any) {
    console.error('데이터 분석 실행 오류:', error);
    throw new Error(error.response?.data?.detail || '데이터 분석 실행에 실패했습니다.');
  }
};

// 별칭 함수들 (기존 컴포넌트 호환성을 위해)
export const getAnalysisById = getAnalysis;

// getMyAnalyses - 페이지네이션 지원 버전 (호환성)
export const getMyAnalyses = async (page?: number, limit?: number): Promise<{ analyses: Analysis[]; total: number }> => {
  return await getUserAnalyses();
};

// 분석 업데이트
export const updateAnalysis = async (analysisId: string, updateData: {
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}): Promise<Analysis> => {
  try {
    const api = await getApiClient();
    const response = await api.put(`/api/analytics/analyses/${analysisId}`, updateData);
    const data = response.data;

    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isPublic: data.is_public || false,
      tags: data.tags || [],
      title: data.title,
      description: data.description
    };
  } catch (error: any) {
    console.error('분석 업데이트 오류:', error);
    throw new Error(error.response?.data?.detail || '분석 업데이트에 실패했습니다.');
  }
};

// 쿼리 제출 (분석 실행의 별칭)
export const submitQuery = runAnalysis;