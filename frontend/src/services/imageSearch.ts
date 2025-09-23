import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 토큰 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ImageResult {
  id: string;
  filename: string;
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  relevance?: number;
  // 새로운 AI 분석 속성들
  similarity?: number;
  product_name?: string;
  price?: number;
  rating_avg?: number;
  brand?: string;
  detailed_analysis?: any;
  // 고급 기능 추가 필드
  clothing_category?: string;
  category_confidence?: number;
}

export interface SearchResult {
  query: string;
  images: ImageResult[];
  totalCount: number;
  searchTime: number;
  separated_images?: Array<{
    type: string;
    filename: string;
    url: string;
    description: string;
  }>;
}

// 이미지 검색 API
export const searchImages = async (query: string, limit: number = 20): Promise<SearchResult> => {
  try {
    const response = await api.get('/api/images/search', {
      params: { q: query, limit }
    });
    
    // URL을 절대 경로로 변환
    const result = response.data;
    result.images = result.images.map((img: ImageResult) => ({
      ...img,
      url: `${API_BASE_URL}${img.url}`
    }));
    
    return result;
  } catch (error: any) {
    console.error('Image search error:', error);
    throw new Error(error.response?.data?.detail || '이미지 검색에 실패했습니다.');
  }
};

// 이미지 파일로 검색 API
export const searchImagesByFile = async (file: File, limit: number = 9): Promise<SearchResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('limit', limit.toString());

    const response = await api.post('/api/images/search-by-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // URL을 절대 경로로 변환
    const result = response.data;
    result.images = result.images.map((img: ImageResult) => ({
      ...img,
      url: `${API_BASE_URL}${img.url}`
    }));

    return result;
  } catch (error: any) {
    console.error('Image file search error:', error);
    throw new Error(error.response?.data?.detail || '이미지 파일 검색에 실패했습니다.');
  }
};

// 실제 고급 이미지 검색 (인체 분할 + 의류 영역 추출 + 카테고리 분류)
export const searchImagesByFileAdvanced = async (file: File, limit: number = 9, clothingType: string = 'all'): Promise<SearchResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('limit', limit.toString());
    formData.append('clothing_type', clothingType);

    const response = await api.post('/api/images/search-by-image-advanced', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // URL을 절대 경로로 변환
    const result = response.data;
    result.images = result.images.map((img: ImageResult) => ({
      ...img,
      url: `${API_BASE_URL}${img.url}`
    }));

    return result;
  } catch (error: any) {
    console.error('Advanced image file search error:', error);
    throw new Error(error.response?.data?.detail || '고급 이미지 파일 검색에 실패했습니다.');
  }
};

// 실제 카탈로그 관리 API
export const addImageToCatalog = async (
  file: File, 
  metadata?: {
    brand?: string;
    title?: string;
    price?: number;
    url?: string;
  }
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      if (metadata.brand) formData.append('brand', metadata.brand);
      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.price !== undefined) formData.append('price', metadata.price.toString());
      if (metadata.url) formData.append('url', metadata.url);
    }

    const response = await api.post('/api/images/catalog/add', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Add image to catalog error:', error);
    throw new Error(error.response?.data?.detail || '카탈로그에 이미지 추가에 실패했습니다.');
  }
};

export const deleteImageFromCatalog = async (imageId: string): Promise<any> => {
  try {
    const response = await api.delete(`/api/images/catalog/delete/${imageId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete image from catalog error:', error);
    throw new Error(error.response?.data?.detail || '카탈로그에서 이미지 제거에 실패했습니다.');
  }
};

// 이미지 목록 조회 API
export const listImages = async (limit: number = 20): Promise<SearchResult> => {
  try {
    const response = await api.get('/api/images/list', {
      params: { limit }
    });

    // URL을 절대 경로로 변환
    const result = response.data;
    result.images = result.images.map((img: ImageResult) => ({
      ...img,
      url: `${API_BASE_URL}${img.url}`
    }));

    return result;
  } catch (error: any) {
    console.error('Image list error:', error);
    throw new Error(error.response?.data?.detail || '이미지 목록 조회에 실패했습니다.');
  }
};