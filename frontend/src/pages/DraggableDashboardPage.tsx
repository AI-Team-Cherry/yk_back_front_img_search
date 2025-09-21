import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Paper,
  Avatar,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics as AnalyticsIcon,
  People,
  Refresh,
  Analytics,
  AutoGraph,
  Insights,
  Assessment,
  Dashboard as DashboardIcon,
  Storage,
  Computer,
  EmojiEvents,
  Star,
  WorkspacePremium,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  getKPIs, 
  KPIData
} from '../services/dashboardAnalytics';
import { getAnalysisResults } from '../services/aiQuery';
import { useAuth } from '../contexts/AuthContext';

const DraggableDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());


  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [kpiData, analysesData] = await Promise.allSettled([
        getKPIs(),
        user?.id ? getAnalysisResults(user.id, 5) : Promise.resolve([])
      ]);

      if (kpiData.status === 'fulfilled') {
        setKpis(kpiData.value);
      }

      if (analysesData.status === 'fulfilled') {
        setRecentAnalyses(analysesData.value);
      }

      setLastUpdated(new Date());
    } catch (error: any) {
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString('ko-KR');
  };



  // KPI Card Component
  const KPICard: React.FC<{
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
    loading?: boolean;
  }> = ({ title, value, change, icon, loading: cardLoading }) => (
    <Card sx={{ 
      height: 140, 
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
      border: '1px solid rgba(148, 163, 184, 0.1)'
    }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {cardLoading ? (
          <Skeleton height={100} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                {title}
              </Typography>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {value}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ color: '#4caf50', mr: 0.5, fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: '#4caf50' }}>
                  +{change}%
                </Typography>
              </Box>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
              {icon}
            </Avatar>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 1, bgcolor: 'background.default', minHeight: '100vh', maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.primary' }}>
              <DashboardIcon sx={{ mr: 2, color: '#60a5fa' }} />
              대시보드
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              실시간 시스템 모니터링 및 AI 분석 현황
            </Typography>
          </Box>
          <Box>
            <Tooltip title="새로고침">
              <span>
                <IconButton onClick={handleRefresh} disabled={loading} sx={{ color: 'text.secondary' }}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#64748b' }}>
          마지막 업데이트: {formatDate(lastUpdated)}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="총 데이터 처리량"
            value={`${formatNumber(kpis?.totalSales || 2500000)}건`}
            change={kpis?.dod || 12.3}
            icon={<Storage />}
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="AI 모델 실행"
            value={formatNumber(kpis?.orders || 15700)}
            change={kpis?.dod || 8.7}
            icon={<Computer />}
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="활성 사용자"
            value={formatNumber(kpis?.customers || 1250)}
            change={kpis?.dod || 5.1}
            icon={<People />}
            loading={loading}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="분석 정확도"
            value="94.2%"
            change={2.8}
            icon={<AnalyticsIcon />}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* AI Insights */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            height: 400, 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                AI 모델 성능 인사이트
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              {loading ? (
                <Skeleton height={200} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
              ) : (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                      모델 정확도 트렌드 (지난 7일)
                    </Typography>
                    <Box sx={{ height: 80, position: 'relative', bgcolor: 'rgba(148, 163, 184, 0.05)', borderRadius: 2, p: 2 }}>
                      <svg width="100%" height="100%">
                        <polyline
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="2"
                          points="20,60 60,45 100,40 140,30 180,25 220,20 260,15 300,10"
                        />
                      </svg>
                      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                          96.8%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(34, 197, 94, 0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 'bold' }}>
                          ↑ 15.2%
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          처리 속도
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(96, 165, 250, 0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                          2.4s
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          응답 시간
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Analyses */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: 400, 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                최근 AI 분석
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              {loading ? (
                <Skeleton height={150} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
              ) : recentAnalyses.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Box
                    component="img"
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/files-blob/public/assets/bot_greenprint-H9JtPdDs77kivcY7EdoYWFriVul1yT.gif"
                    alt="AI Bot"
                    sx={{
                      width: 80,
                      height: 80,
                      mb: 1,
                      borderRadius: 2,
                      filter: 'drop-shadow(0 4px 12px rgba(76, 175, 80, 0.4))'
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                    AI 어시스턴트가 대기 중
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    sx={{ bgcolor: '#60a5fa', '&:hover': { bgcolor: '#3b82f6' } }}
                    onClick={() => navigate('/analysis')}
                  >
                    분석 시작
                  </Button>
                </Box>
              ) : (
                recentAnalyses.map((analysis) => (
                  <Paper 
                    key={analysis.id} 
                    sx={{ 
                      p: 1, 
                      mb: 1, 
                      bgcolor: 'rgba(148, 163, 184, 0.05)',
                      border: '1px solid rgba(148, 163, 184, 0.1)'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white' }}>
                      {analysis.query}
                    </Typography>
                  </Paper>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Monitoring */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            height: 450, 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                실시간 시스템 모니터링
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              <Grid container spacing={3}>
                {/* CPU & GPU 사용률 */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    CPU 사용률
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={73}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      color="primary"
                    />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'white', minWidth: '35px' }}>73%</Typography>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    GPU 사용률
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={85}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      color="error"
                    />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'white', minWidth: '35px' }}>85%</Typography>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    메모리 사용률
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={58}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      color="success"
                    />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'white', minWidth: '35px' }}>58%</Typography>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    디스크 I/O
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={42}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      color="warning"
                    />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'white', minWidth: '35px' }}>42%</Typography>
                  </Box>
                </Grid>
                
                {/* 네트워크 & 성능 그래프 */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    네트워크 트래픽 (실시간)
                  </Typography>
                  <Box sx={{ height: 100, position: 'relative', bgcolor: 'rgba(148, 163, 184, 0.05)', borderRadius: 1, p: 1, mb: 2 }}>
                    <svg width="100%" height="100%">
                      {/* Inbound 트래픽 */}
                      <polyline
                        fill="none"
                        stroke="#4caf50"
                        strokeWidth="2"
                        points="10,70 25,65 40,50 55,45 70,40 85,35 100,30 115,25 130,30 145,35 160,25 175,20"
                      />
                      {/* Outbound 트래픽 */}
                      <polyline
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="2"
                        points="10,80 25,75 40,70 55,65 70,60 85,55 100,50 115,55 130,60 145,65 160,55 175,50"
                      />
                    </svg>
                    <Box sx={{ position: 'absolute', top: 5, right: 5 }}>
                      <Typography variant="caption" sx={{ color: '#4caf50' }}>↓ 124 MB/s</Typography>
                      <Typography variant="caption" sx={{ color: '#ff9800', display: 'block' }}>↑ 89 MB/s</Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    시스템 온도
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(96, 165, 250, 0.1)', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                          67°C
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          CPU 온도
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                          74°C
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          GPU 온도
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
                
                {/* 추가 시스템 정보 */}
                <Grid item xs={12}>
                  <Box sx={{ bgcolor: 'rgba(148, 163, 184, 0.05)', borderRadius: 1, p: 2 }}>
                    <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8', mb: 2 }}>
                      시스템 상태
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 'bold' }}>
                            99.9%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            가동률
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                            847
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            활성 프로세스
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#a855f7', fontWeight: 'bold' }}>
                            2.4ms
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            평균 응답시간
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                            15.7TB
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            저장공간 사용
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Award */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: 450, 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <EmojiEvents sx={{ mr: 1, color: '#f59e0b' }} />
                이달의 우수사원
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 2 }}>
                2025년 9월
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              <Box sx={{ 
                textAlign: 'center', 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                gap: 2
              }}>
                <Box
                  component="img"
                  src="https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fb8QJSZ%2FbtsQBHbYbAz%2FAAAAAAAAAAAAAAAAAAAAADjiHT1zhFQJ4YEJzJVWFhb_W9nBtsKxhGopEHr3N2Ps%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1759244399%26allow_ip%3D%26allow_referer%3D%26signature%3DVln51Z8rUvtfmHXAccyQ5cfb18k%253D"
                  alt="우수사원"
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    border: '4px solid',
                    borderColor: '#f59e0b',
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.5)',
                    mx: 'auto'
                  }}
                />
                
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: 'white', mb: 1 }}>
                    이솔비
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#94a3b8', mb: 2 }}>
                    AI 분석팀
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} sx={{ color: '#f59e0b', fontSize: 20 }} />
                    ))}
                  </Box>
                  
                  <Chip
                    icon={<WorkspacePremium />}
                    label="우수 성과상"
                    sx={{ 
                      bgcolor: 'rgba(245, 158, 11, 0.2)', 
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.875rem',
                      height: 32
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DraggableDashboardPage;