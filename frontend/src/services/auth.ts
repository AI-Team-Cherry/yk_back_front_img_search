import axios from 'axios';
import { LoginRequest, LoginResponse, User } from '../types';
import { apiConfig } from '../utils/apiConfig';

// API 인스턴스 생성 (baseURL은 동적으로 설정)
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 서버 자동 감지 및 설정
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

// 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// 로그인 (Form-data 방식으로 변경)
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  await ensureApiConfigured(); // API 서버 자동 감지
  try {
    console.log('API 호출 데이터:', {
      username: credentials.employeeId,
      password: credentials.password
    });
    
    // OAuth2PasswordRequestForm에 맞게 form-data로 전송
    const formData = new FormData();
    formData.append('username', credentials.employeeId);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    const data = response.data;
    
    // 토큰 저장
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('userId', credentials.employeeId); // 사용자 ID도 저장
    
    // 사용자 정보 구성 (현재 백엔드에서 user 정보를 반환하지 않으므로 기본값 사용)
    const user = {
      id: credentials.employeeId,
      employeeId: credentials.employeeId,
      name: credentials.employeeId, // 실제로는 별도 API에서 가져와야 함
      department: 'Unknown',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    
    return {
      token: data.access_token,
      refreshToken: '',
      user: {
        ...user,
        role: (user.role as 'user' | 'admin') || 'user'
      }
    };
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    throw new Error(error.response?.data?.detail || '로그인에 실패했습니다.');
  }
};

// 로그아웃
export const logout = async (): Promise<void> => {
  await ensureApiConfigured(); // API 서버 자동 감지
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // 로컬 스토리지 정리
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// 현재 사용자 정보 조회
export const getCurrentUser = async (): Promise<User> => {
  await ensureApiConfigured(); // API 서버 자동 감지
  try {
    const response = await api.get('/auth/me');
    const userData = response.data;
    
    return {
      id: userData.id || userData.username,
      employeeId: userData.employeeId || userData.username || userData.employee_id,
      name: userData.name || 'Unknown',
      email: userData.email,
      phone: userData.phone,
      department: userData.department || 'Unknown',
      role: userData.role || 'user',
      bio: userData.bio,
      profilePicture: userData.profilePicture,
      jobTitle: userData.jobTitle,
      company: userData.company,
      workLocation: userData.workLocation,
      lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : undefined,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
    };
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// 회원가입
export const register = async (userData: {
  employeeId: string;
  password: string;
  name: string;
  department: string;
}): Promise<User> => {
  await ensureApiConfigured(); // API 서버 자동 감지
  try {
    const response = await api.post('/auth/register', {
      employeeId: userData.employeeId,
      password: userData.password,
      name: userData.name,
      department: userData.department,
      role: 'user'
    });
    
    const data = response.data;
    
    return {
      id: data.id,
      employeeId: data.employeeId,
      name: data.name || userData.name,
      department: data.department || userData.department,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error: any) {
    console.error('Register error:', error);
    throw new Error(error.response?.data?.detail || '회원가입에 실패했습니다.');
  }
};

// 토큰 검증
export const verifyToken = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};

// 프로필 업데이트
export const updateProfile = async (profileData: {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  bio?: string;
  profilePicture?: string;
  jobTitle?: string;
  company?: string;
  workLocation?: string;
}): Promise<User> => {
  await ensureApiConfigured(); // API 서버 자동 감지
  try {
    const response = await api.put('/auth/profile', profileData);
    const userData = response.data;
    
    // 로컬 스토리지의 사용자 정보 업데이트
    const updatedUser = {
      id: userData.id,
      employeeId: userData.employeeId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      department: userData.department,
      role: userData.role,
      bio: userData.bio,
      profilePicture: userData.profilePicture,
      jobTitle: userData.jobTitle,
      company: userData.company,
      workLocation: userData.workLocation,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return updatedUser;
  } catch (error: any) {
    console.error('Profile update error:', error);
    throw new Error(error.response?.data?.detail || '프로필 업데이트에 실패했습니다.');
  }
};