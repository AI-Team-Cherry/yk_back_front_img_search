// User types
export interface User {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  role: 'user' | 'admin';
  bio?: string;
  profilePicture?: string;
  jobTitle?: string;
  company?: string;
  workLocation?: string;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Analysis types
export interface Analysis {
  id: string;
  userId: string;
  query: string;
  result: AnalysisResult;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags: string[];
  title?: string;
  description?: string;
}

export interface AnalysisResult {
  visualization?: VegaLiteSpec | null;
  analysis: string;
  data: any[];
  model_status?: {
    status: string;
    model: string;
    type: string;
  };
  prediction_basis?: string;
  error?: string;
  raw_response?: AIResponse; // 백엔드에서 받은 원본 응답 저장

  // DataAnalyticsDashboard 스타일 결과를 위한 추가 필드들
  mongodb_query?: string;
  columns?: string[];
  sample_data?: any[];
  csv_data?: string;
  total_count?: number;
  chart_options?: {
    type: string;
    showGrid: boolean;
    showLegend: boolean;
    dataLimit: number;
  };
}

// 새로운 백엔드 AI 응답 타입 정의
export interface AIResponse {
  status: string;
  query: string;
  mongodb_results?: {
    collection: string;
    pipeline: any[];
    data: ProductData[];
    summary: string;
  };
  vector_results?: {
    context: string[];
    similarity_scores: number[];
  };
  ai_analysis?: {
    answer: string;
    insights: string;
    recommendations: string;
  };
  visualizations?: VegaLiteSpec[];
  report?: {
    title: string;
    createdAt: string;
    summary: string;
    details: {
      insights: string;
      recommendations: string[];
    };
  };
}

// 상품 데이터 타입
export interface ProductData {
  _id: string;
  product_id: string;
  name: string;
  brand: string;
  category_l1: string;
  gender: string;
  price: number;
  views_1m: number;
  sales_cum: number;
  hearts: number;
  reviews_count: number;
  rating_avg: number;
  main_image: string;
  image_files: string;
}

export interface VegaLiteSpec {
  $schema?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  data?: {
    values?: any[];
  };
  mark?: string | { type: string; [key: string]: any };
  encoding?: {
    [key: string]: any;
  };
  [key: string]: any;
}

// Shared Analysis
export interface SharedAnalysis {
  id: string;
  analysisId: string;
  shareId: string;
  shareUrl: string;
  createdAt: Date;
  accessCount: number;
  analysis?: Analysis;

  // 호환성을 위한 추가 필드들
  originalAnalysisId: string;
  sharedBy: User;
  sharedAt: Date;
  usageCount: number;
  rating: number;
  category: string;
  query: string;
  title: string;
  tags: string[];

  // 백엔드에서 직접 오는 결과 데이터
  result?: any;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QueryRequest {
  query: string;
  collections?: string[];
  use_ai_mode?: boolean;
  tags?: string[];
}

export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}