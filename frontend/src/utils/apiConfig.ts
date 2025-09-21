import axios from 'axios';

// API 서버 포트 감지 및 자동 연결 설정
class ApiConfig {
  private baseURL: string = '';
  private isInitialized: boolean = false;

  // 가능한 API 서버 주소들 (우선순위 순)
  private readonly POSSIBLE_URLS = [
    'http://localhost:8001',
    'http://localhost:8000',
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8000'
  ];

  async detectAvailableServer(): Promise<string> {
    // 개발 중에는 항상 재검사하도록 설정
    if (this.isInitialized && this.baseURL && process.env.NODE_ENV === 'production') {
      return this.baseURL;
    }

    // 환경변수에서 지정된 URL이 있으면 우선 사용 (건강검사 생략)
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl) {
      this.baseURL = envUrl;
      this.isInitialized = true;
      console.log(`✅ 환경변수 API URL 사용: ${envUrl}`);
      return envUrl;
    }

    // 순차적으로 각 포트 테스트
    for (const url of this.POSSIBLE_URLS) {
      try {
        await this.testConnection(url);
        this.baseURL = url;
        this.isInitialized = true;
        console.log(`✅ API 서버 자동 감지 성공: ${url}`);
        return url;
      } catch (error) {
        console.log(`❌ ${url} 연결 실패, 다음 포트 시도...`);
      }
    }

    // 모든 연결 실패시 기본값 사용
    const fallbackUrl = 'http://localhost:8000';
    console.error('⚠️ 모든 API 서버 연결 실패. 기본 포트 사용:', fallbackUrl);
    this.baseURL = fallbackUrl;
    this.isInitialized = true;
    return fallbackUrl;
  }

  private async testConnection(url: string): Promise<void> {
    // /health 엔드포인트를 먼저 시도하고, 없으면 / (루트) 엔드포인트를 시도
    try {
      const response = await axios.get(`${url}/health`, {
        timeout: 3000, // 3초 타임아웃
        validateStatus: (status) => status < 500 // 500 미만이면 서버가 응답함
      });
      return response.data;
    } catch (error) {
      // health 엔드포인트가 없으면 루트 엔드포인트 시도
      const response = await axios.get(`${url}/`, {
        timeout: 3000,
        validateStatus: (status) => status < 500
      });
      return response.data;
    }
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  reset(): void {
    this.isInitialized = false;
    this.baseURL = '';
  }
}

export const apiConfig = new ApiConfig();