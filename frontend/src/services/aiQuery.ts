import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface QueryRequest {
  userId: string;
  query: string;
}

export interface QueryResponse {
  status: string;
  query: string;
  mongodb_results?: any;
  vector_results?: any;
  ai_analysis?: any;
  visualizations?: any[];
  report?: any;
}

export interface AnalysisResult {
  _id: string;
  userId: string;
  query: string;
  createdAt: string;
  output: any;
}

// AI 질의 실행
export const executeQuery = async (queryData: QueryRequest): Promise<QueryResponse> => {
  try {
    const token = localStorage.getItem('token');
    console.log('AI Query Request:', { queryData, token: token ? 'exists' : 'missing', url: `${API_BASE_URL}/query/` });

    const response = await axios.post(`${API_BASE_URL}/query/`, queryData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('AI Query Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('AI Query Error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);

    const errorMessage = error.response?.data?.detail || error.message || 'AI 질의 실행 중 오류가 발생했습니다.';
    throw new Error(errorMessage);
  }
};

// 분석 결과 목록 조회
export const getAnalysisResults = async (userId: string, limit: number = 20): Promise<AnalysisResult[]> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/result/list`, {
      params: { userId, limit },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // 백엔드 응답에서 items 배열 추출
    return response.data.items || [];
  } catch (error) {
    console.error('Analysis results error:', error);
    throw new Error('분석 결과를 불러오는 중 오류가 발생했습니다.');
  }
};