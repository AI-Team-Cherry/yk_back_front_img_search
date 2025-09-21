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
  getSalesByDepartment, 
  KPIData,
  SalesByDepartment 
} from '../services/dashboardAnalytics';
import { getAnalysisResults } from '../services/aiQuery';
import { useAuth } from '../contexts/AuthContext';

const EnhancedDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [salesByDept, setSalesByDept] = useState<SalesByDepartment[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Parallel API calls for better performance
      const [kpiData, deptData, analysesData] = await Promise.allSettled([
        getKPIs(),
        getSalesByDepartment(),
        user?.id ? getAnalysisResults(user.id, 5) : Promise.resolve([])
      ]);

      // Handle KPI data
      if (kpiData.status === 'fulfilled') {
        setKpis(kpiData.value);
      }

      // Handle department sales data
      if (deptData.status === 'fulfilled') {
        setSalesByDept(deptData.value);
      }

      // Handle recent analyses
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

  // Refresh data
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Format percentage
  const formatPercentage = (num: number): string => {
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleString('ko-KR');
  };

  // AI Analytics Insights Component
  const AnalyticsInsights: React.FC = () => (
    <Card sx={{ 
      height: '100%', 
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
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={80} sx={{ mb: 2, bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ))
        ) : (
          <Box>
            {/* 실시간 인사이트 차트 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                모델 정확도 트렌드 (지난 7일)
              </Typography>
              <Box sx={{ height: 120, position: 'relative', bgcolor: 'rgba(148, 163, 184, 0.05)', borderRadius: 2, p: 2 }}>
                <svg width="100%" height="100%">
                  {/* 정확도 라인 차트 */}
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="3"
                    points="20,80 60,65 100,60 140,45 180,40 220,35 260,30 300,25"
                  />
                  {/* 데이터 포인트 */}
                  {[20, 60, 100, 140, 180, 220, 260, 300].map((x, index) => {
                    const y = [80, 65, 60, 45, 40, 35, 30, 25][index];
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#60a5fa"
                        stroke="#1e293b"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                  <Typography variant="h6" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                    96.8%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    현재 정확도
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* 주요 인사이트 메트릭 */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 'bold' }}>
                    ↑ 15.2%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    처리 속도 향상
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(96, 165, 250, 0.1)', borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ color: '#60a5fa', fontWeight: 'bold' }}>
                    2.4s
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    평균 응답 시간
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(168, 85, 247, 0.1)', borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ color: '#a855f7', fontWeight: 'bold' }}>
                    99.9%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    시스템 가동률
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    847
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    오늘 분석 완료
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Recent AI Analyses Component
  const RecentAnalyses: React.FC = () => (
    <Card sx={{ 
      height: '100%', 
      bgcolor: '#1e293b',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      border: '1px solid rgba(148, 163, 184, 0.1)'
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'white' }}>
            최근 AI 분석
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/analysis')}
            startIcon={<Analytics />}
            sx={{ color: '#60a5fa', borderColor: '#60a5fa' }}
          >
            더 보기
          </Button>
        </Box>
        <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
        
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={80} sx={{ mb: 1, bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ))
        ) : recentAnalyses.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Box
              component="img"
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/files-blob/public/assets/bot_greenprint-H9JtPdDs77kivcY7EdoYWFriVul1yT.gif"
              alt="AI Bot"
              sx={{
                width: 120,
                height: 120,
                mb: 2,
                borderRadius: 3,
                filter: 'drop-shadow(0 8px 24px rgba(76, 175, 80, 0.4))'
              }}
            />
            <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
              AI 어시스턴트가 분석을 기다리고 있습니다
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 2, color: '#64748b' }}>
              자연어로 질문하면 즉시 데이터 분석을 시작합니다
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 1, bgcolor: '#60a5fa', '&:hover': { bgcolor: '#3b82f6' } }}
              onClick={() => navigate('/analysis')}
            >
              AI 분석 시작하기
            </Button>
          </Box>
        ) : (
          recentAnalyses.map((analysis, index) => (
            <Paper 
              key={analysis.id} 
              sx={{ 
                p: 2, 
                mb: 1, 
                cursor: 'pointer',
                bgcolor: 'rgba(148, 163, 184, 0.05)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' }
              }}
              onClick={() => navigate(`/analysis/${analysis.id}`)}
            >
              <Typography variant="body2" gutterBottom sx={{ color: 'white' }}>
                {analysis.query}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {formatDate(new Date(analysis.createdAt))}
              </Typography>
            </Paper>
          ))
        )}
      </CardContent>
    </Card>
  );

  // Quick Actions Component
  const QuickActions: React.FC = () => (
    <Card sx={{ 
      height: '100%', 
      bgcolor: '#1e293b',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      border: '1px solid rgba(148, 163, 184, 0.1)'
    }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
          빠른 작업
        </Typography>
        <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
        
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Analytics />}
              onClick={() => navigate('/analysis')}
              sx={{ mb: 1, color: '#60a5fa', borderColor: '#60a5fa' }}
            >
              AI 분석
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => navigate('/sentiment')}
              sx={{ mb: 1, color: '#60a5fa', borderColor: '#60a5fa' }}
            >
              감정분석
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AutoGraph />}
              sx={{ mb: 1, color: '#60a5fa', borderColor: '#60a5fa' }}
            >
              시각화
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Insights />}
              onClick={() => navigate('/my-page')}
              sx={{ mb: 1, color: '#60a5fa', borderColor: '#60a5fa' }}
            >
              내 분석
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 4, bgcolor: '#0f172a', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
              <DashboardIcon sx={{ mr: 2, color: '#60a5fa' }} />
              대시보드
            </Typography>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
              실시간 데이터 분석 현황과 AI 모델 성능을 모니터링하세요
            </Typography>
          </Box>
          <Box>
            <Tooltip title="새로고침">
              <span>
                <IconButton onClick={handleRefresh} disabled={loading} sx={{ color: '#94a3b8' }}>
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
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton height={140} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ) : (
            <Card sx={{ 
              height: '100%', 
              position: 'relative', 
              overflow: 'visible',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      총 데이터 처리량
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatNumber(kpis?.totalSales || 2500000)}건
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', mr: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                        +{kpis?.dod || 12.3}%
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
                    <Storage sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton height={140} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ) : (
            <Card sx={{ 
              height: '100%', 
              position: 'relative', 
              overflow: 'visible',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      AI 모델 실행
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatNumber(kpis?.orders || 15700)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', mr: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                        +{kpis?.dod || 8.7}%
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
                    <Computer sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton height={140} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ) : (
            <Card sx={{ 
              height: '100%', 
              position: 'relative', 
              overflow: 'visible',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      활성 사용자
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {formatNumber(kpis?.customers || 1250)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', mr: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                        +{kpis?.dod || 5.1}%
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
                    <People sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <Skeleton height={140} sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }} />
          ) : (
            <Card sx={{ 
              height: '100%', 
              position: 'relative', 
              overflow: 'visible',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      분석 정확도
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      94.2%
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', mr: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                        +2.8%
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
                    <AnalyticsIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <AnalyticsInsights />
        </Grid>
        <Grid item xs={12} lg={4}>
          <RecentAnalyses />
        </Grid>
        <Grid item xs={12} lg={6}>
          <QuickActions />
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            height: '100%', 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                오늘의 하이라이트
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(96, 165, 250, 0.1)', borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 'bold', mb: 1 }}>
                      🎆 새로운 기록 달성!
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      이솔비님이 오늘 최고 정확도 96.8%를 달성했습니다!
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 'bold', mb: 1 }}>
                      📈 시스템 성능 개선
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      AI 모델 처리 속도가 15.2% 향상되었습니다.
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(168, 85, 247, 0.1)', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#a855f7', fontWeight: 'bold', mb: 1 }}>
                      🎯 오늘 목표 달성
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      일일 분석 목표 800건을 초과하여 847건을 완료했습니다.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            height: '100%', 
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
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                      CPU 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={73}
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                        color="primary"
                      />
                      <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>73%</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                      메모리 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={58}
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                        color="success"
                      />
                      <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>58%</Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                      디스크 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={89}
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                        color="warning"
                      />
                      <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>89%</Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                    네트워크 트래픽
                  </Typography>
                  <Box sx={{ height: 120, position: 'relative' }}>
                    <svg width="100%" height="100%">
                      {/* 네트워크 그래프 */}
                      <polyline
                        fill="none"
                        stroke="#4caf50"
                        strokeWidth="2"
                        points="10,80 30,60 50,40 70,30 90,25 110,35 130,45 150,30 170,20 190,15"
                      />
                      <polyline
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="2"
                        points="10,90 30,85 50,70 70,65 90,60 110,70 130,75 150,65 170,55 190,50"
                      />
                    </svg>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 3, bgcolor: '#4caf50', borderRadius: 1 }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Inbound</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 3, bgcolor: '#ff9800', borderRadius: 1 }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Outbound</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ 
            height: '100%', 
            bgcolor: '#1e293b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                <EmojiEvents sx={{ mr: 1, color: '#f59e0b' }} />
                이달의 우수사원
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
                2025년 9월
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.2)' }} />
              
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  component="img"
                  src="https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fb8QJSZ%2FbtsQBHbYbAz%2FAAAAAAAAAAAAAAAAAAAAADjiHT1zhFQJ4YEJzJVWFhb_W9nBtsKxhGopEHr3N2Ps%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1759244399%26allow_ip%3D%26allow_referer%3D%26signature%3DVln51Z8rUvtfmHXAccyQ5cfb18k%253D"
                  alt="우수사원"
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    mb: 2,
                    border: '4px solid',
                    borderColor: '#f59e0b',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)'
                  }}
                />
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
                  이솔비
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: '#94a3b8' }}>
                  AI 분석팀
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} sx={{ color: '#f59e0b', fontSize: 16 }} />
                  ))}
                </Box>
                <Chip
                  icon={<WorkspacePremium />}
                  label="우수 성과상"
                  sx={{ 
                    mt: 1,
                    bgcolor: 'rgba(245, 158, 11, 0.2)', 
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                  size="small"
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#94a3b8' }}>
                  2025년 9월 최고 분석 정확도 달성
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedDashboardPage;