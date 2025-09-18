import axios from 'axios';

// cherry_back 백엔드 API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
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

// 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 데이터 업로드 응답 타입
export interface UploadResponse {
  success: boolean;
  message: string;
  file_info?: {
    filename: string;
    size: number;
    type: string;
  };
  processing_info?: {
    total_rows: number;
    processed_rows: number;
    errors: string[];
  };
}

// 파일 업로드
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/ingest/upload', formData);
    
    return {
      success: true,
      message: response.data.message || '파일이 성공적으로 업로드되었습니다.',
      file_info: {
        filename: file.name,
        size: file.size,
        type: file.type
      },
      processing_info: response.data.processing_info || {
        total_rows: 0,
        processed_rows: 0,
        errors: []
      }
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    throw new Error(
      error.response?.data?.detail || '파일 업로드 중 오류가 발생했습니다.'
    );
  }
};

// 지원되는 파일 형식 확인
export const getSupportedFileTypes = (): string[] => {
  return [
    '.csv',
    '.json',
    '.xlsx',
    '.xls',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
};

// 파일 크기 제한 확인
export const getMaxFileSize = (): number => {
  // 50MB 제한
  return 50 * 1024 * 1024;
};

// 파일 유효성 검사
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const supportedTypes = getSupportedFileTypes();
  const maxSize = getMaxFileSize();
  
  // 파일 크기 검사
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${maxSize / (1024 * 1024)}MB까지 업로드 가능합니다.`
    };
  }
  
  // 파일 형식 검사
  const isValidType = supportedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    } else {
      return file.type === type;
    }
  });
  
  if (!isValidType) {
    return {
      valid: false,
      error: `지원되지 않는 파일 형식입니다. 지원 형식: ${supportedTypes.filter(t => t.startsWith('.')).join(', ')}`
    };
  }
  
  return { valid: true };
};

// 업로드 상태 조회 (미래 확장용)
export const getUploadStatus = async (uploadId: string): Promise<any> => {
  try {
    const response = await api.get(`/ingest/status/${uploadId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get upload status error:', error);
    throw new Error(
      error.response?.data?.detail || '업로드 상태 조회 중 오류가 발생했습니다.'
    );
  }
};

export default {
  uploadFile,
  getSupportedFileTypes,
  getMaxFileSize,
  validateFile,
  getUploadStatus
};