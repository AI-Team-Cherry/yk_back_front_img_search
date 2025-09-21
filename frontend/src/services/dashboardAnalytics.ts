import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface KPIData {
  totalSales: number;
  orders: number;
  customers: number;
  dod: number; // Day over day growth
}

export interface SalesByDepartment {
  department: string;
  sales: number;
  growth: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
  type: 'line' | 'bar' | 'pie';
}

// KPI 데이터 조회
export const getKPIs = async (): Promise<KPIData> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/analytics/kpis`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('KPI 데이터를 불러오는 중 오류가 발생했습니다.');
  }
};

// 부서별 매출 데이터 조회
export const getSalesByDepartment = async (from?: string, to?: string): Promise<SalesByDepartment[]> => {
  try {
    const token = localStorage.getItem('token');
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    
    const response = await axios.get(`${API_BASE_URL}/api/analytics/sales-by-dept`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('부서별 매출 데이터를 불러오는 중 오류가 발생했습니다.');
  }
};

// 시계열 데이터 조회
export const getTimeSeriesData = async (
  metric: 'sales' | 'orders', 
  from?: string, 
  to?: string
): Promise<TimeSeriesData[]> => {
  try {
    const token = localStorage.getItem('token');
    const params: any = { metric };
    if (from) params.from = from;
    if (to) params.to = to;
    
    const response = await axios.get(`${API_BASE_URL}/api/analytics/timeseries`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('시계열 데이터를 불러오는 중 오류가 발생했습니다.');
  }
};

// 동적 차트 데이터 조회
export const getChartData = async (
  type: 'line' | 'bar' | 'pie',
  metric: 'sales' | 'orders' | 'customers'
): Promise<ChartData> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/visualization/chart`, {
      params: { type, metric },
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('차트 데이터를 불러오는 중 오류가 발생했습니다.');
  }
};