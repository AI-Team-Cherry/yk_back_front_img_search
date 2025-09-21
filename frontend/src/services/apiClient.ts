import axios, { AxiosInstance } from 'axios';
import { apiConfig } from '../utils/apiConfig';

// 공통 API 클라이언트 생성
let apiClient: AxiosInstance | null = null;
let isInitialized = false;

export const getApiClient = async (): Promise<AxiosInstance> => {
  if (!apiClient || !isInitialized) {
    // API 서버 자동 감지
    const baseURL = await apiConfig.detectAvailableServer();

    apiClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 인증 토큰 자동 추가
    apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 토큰 만료 처리
    apiClient.interceptors.response.use(
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

    isInitialized = true;
    console.log(`🔗 API 클라이언트 초기화 완료: ${baseURL}`);
  }

  return apiClient;
};

// API 클라이언트 재설정 (포트 변경시 등)
export const resetApiClient = () => {
  apiClient = null;
  isInitialized = false;
  apiConfig.reset();
};

// 현재 API 베이스 URL 가져오기
export const getCurrentApiUrl = (): string => {
  return apiConfig.getBaseURL();
};