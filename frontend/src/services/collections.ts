import axios from 'axios';
import { apiConfig } from '../utils/apiConfig';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

let apiInitialized = false;

const ensureApiConfigured = async () => {
  if (!apiInitialized) {
    const baseURL = await apiConfig.detectAvailableServer();
    api.defaults.baseURL = baseURL;
    apiInitialized = true;
  }
};

// 인증 토큰을 요청에 자동으로 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CollectionInfo {
  name: string;
  documentCount: number;
  sampleFields: string[];
}

// MongoDB 컬렉션 목록 가져오기
export const getCollections = async (): Promise<string[]> => {
  try {
    await ensureApiConfigured();
    const response = await api.get('/api/collections');
    return response.data;
  } catch (error: any) {
    console.error('컬렉션 목록 가져오기 실패:', error);
    throw new Error(error.message || '컬렉션 목록을 가져오는데 실패했습니다.');
  }
};

// 특정 컬렉션 정보 가져오기
export const getCollectionInfo = async (collectionName: string): Promise<CollectionInfo> => {
  try {
    await ensureApiConfigured();
    const response = await api.get(`/api/collections/${collectionName}/info`);
    return response.data;
  } catch (error: any) {
    console.error('컬렉션 정보 가져오기 실패:', error);
    throw new Error(error.message || '컬렉션 정보를 가져오는데 실패했습니다.');
  }
};