import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Divider,
  Avatar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Share,
  Edit,
  Delete,
  Bookmark,
  ThumbUp,
  Download,
  Analytics,
  TrendingUp,
  QueryStats,
  ContentCopy,
  Code,
  TableChart,
  ShowChart,
  DonutSmall,
  Refresh,
  Visibility,
  Settings,
} from '@mui/icons-material';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getAnalysisById, deleteAnalysis, updateAnalysis, saveAnalysis, getSharedAnalyses } from '../services/analytics';
import { Analysis, SharedAnalysis } from '../types';
import { useAuth } from '../contexts/AuthContext';
import VegaVisualization from '../components/VegaVisualization';
import ReactMarkdown from 'react-markdown';
import { VegaEmbed } from 'react-vega';
import { exportAnalysisToPDF, exportSharedAnalysisToPDF } from '../utils/pdfExport';

const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sharedAnalysis, setSharedAnalysis] = useState<SharedAnalysis | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // DataAnalyticsDashboard 스타일 결과를 위한 상태
  const [dashboardResult, setDashboardResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [chartOptions, setChartOptions] = useState({
    type: 'bar',
    showGrid: true,
    showLegend: true,
    dataLimit: 10,
  });
  
  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (id) {
      loadAnalysis(id);
    }
  }, [id]);

  const loadAnalysis = async (analysisId: string) => {
    try {
      // 공유 분석 로드
      setIsShared(true);
      const sharedAnalyses = await getSharedAnalyses();
      const shared = sharedAnalyses.analyses.find(s => s.id === analysisId);

      if (shared) {
        setSharedAnalysis(shared);

        console.log('🔍 [Shared Analysis Data]', shared);

        // 백엔드에서 받은 데이터 구조 확인
        let analysisData: Analysis;
        let resultData: any = null;

        // shared.result에 직접 DataAnalyticsDashboard 스타일 데이터가 있는지 확인
        if (shared.result) {
          resultData = shared.result;
          console.log('📊 [Result Data]', resultData);
        }
        // shared.analysis가 있으면 그것을 사용
        else if (shared.analysis) {
          analysisData = shared.analysis;
          resultData = shared.analysis.result;
        }

        // DataAnalyticsDashboard 스타일 결과 처리
        if (resultData && (resultData.mongodb_query || resultData.columns || resultData.sample_data)) {
          console.log('✅ [Dashboard Style Result Found]', resultData);
          setDashboardResult({
            query: shared.query,
            mongodb_query: resultData.mongodb_query || '',
            columns: resultData.columns || [],
            sample_data: resultData.sample_data || [],
            csv_data: resultData.csv_data || '',
            total_count: resultData.total_count || 0,
            chart_options: resultData.chart_options || chartOptions
          });
        }

        // Analysis 객체 생성
        analysisData = {
          id: shared.id,
          userId: shared.sharedBy?.id || shared.sharedBy?.employeeId || 'unknown',
          query: shared.query,
          result: resultData || { analysis: '', data: [] },
          createdAt: shared.createdAt || new Date(),
          updatedAt: shared.createdAt || new Date(),
          isPublic: true,
          tags: shared.tags || [],
          title: shared.title,
          description: ''
        };

        setAnalysis(analysisData);
        setEditTitle(shared.title || shared.query);
        setEditDescription('');
        setEditTags(shared.tags || []);
      } else {
        throw new Error('공유 분석을 찾을 수 없습니다.');
      }
    } catch (err: any) {
      console.error('❌ [Load Analysis Error]', err);
      setError(err.message || '분석을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!analysis) return;

    try {
      const updatedAnalysis = await updateAnalysis(analysis.id, {
        title: editTitle,
        description: editDescription,
        tags: editTags,
      });
      setAnalysis(updatedAnalysis);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update analysis:', error);
    }
  };

  const handleDelete = async () => {
    if (!analysis) return;

    try {
      await deleteAnalysis(analysis.id);
      
      // 성공적으로 삭제되면 MyPage로 이동
      navigate('/mypage', { 
        state: { 
          message: '분석이 성공적으로 삭제되었습니다.',
          severity: 'success'
        }
      });
    } catch (error) {
      console.error('Failed to delete analysis:', error);
      
      // 에러가 발생해도 로컬에서는 삭제되었을 가능성이 높으므로 MyPage로 이동
      navigate('/mypage', { 
        state: { 
          message: '분석이 삭제되었지만 서버 동기화에 문제가 있을 수 있습니다.',
          severity: 'warning'
        }
      });
    }
  };

  const handleSaveCopy = async () => {
    if (!analysis) return;

    try {
      await saveAnalysis({
        query: analysis.query,
        result: analysis.result,
        title: `${analysis.title || analysis.query} (복사본)`,
        description: analysis.description,
        tags: analysis.tags,
        isPublic: false,
      });
      setSaveDialogOpen(false);
      navigate('/mypage');
    } catch (error) {
      console.error('Failed to save copy:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const isOwner = analysis && user && analysis.userId === user.id;

  // 제목에서 "데이터 분석:" 접두사 제거하는 함수
  const cleanTitle = (title: string) => {
    return title.replace(/^데이터\s*분석\s*:\s*/i, '').trim();
  };

  // DataAnalyticsDashboard 스타일 차트 생성 함수
  const generateChartData = () => {
    if (!dashboardResult?.sample_data || dashboardResult.sample_data.length === 0) return [];

    const numericColumns = dashboardResult.columns.filter((col: string) => {
      const sampleValue = dashboardResult.sample_data[0][col];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    });

    if (numericColumns.length === 0) return [];

    const limitedData = dashboardResult.sample_data.slice(0, chartOptions.dataLimit);

    return limitedData.map((row: any, index: number) => {
      const chartRow: any = { name: `항목 ${index + 1}` };

      numericColumns.forEach((col: string) => {
        const value = Number(row[col]);
        if (!isNaN(value)) {
          chartRow[col] = value;
        }
      });

      // 이름 컬럼이 있으면 사용
      const nameColumns = dashboardResult.columns.filter((col: string) =>
        col.toLowerCase().includes('name') ||
        col.toLowerCase().includes('title') ||
        col.toLowerCase().includes('product')
      );

      if (nameColumns.length > 0 && row[nameColumns[0]]) {
        chartRow.name = String(row[nameColumns[0]]).slice(0, 20);
      }

      return chartRow;
    });
  };

  const renderChart = () => {
    const chartData = generateChartData();
    if (chartData.length === 0) {
      return (
        <Alert severity="info">
          차트를 생성할 수 있는 숫자 데이터가 없습니다.
        </Alert>
      );
    }

    const numericColumns = dashboardResult?.columns.filter((col: string) => {
      const sampleValue = dashboardResult.sample_data[0][col];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    }) || [];

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

    if (chartOptions.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            {chartOptions.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            {chartOptions.showLegend && <Legend />}
            {numericColumns.slice(0, 3).map((col: string, index: number) => (
              <Bar key={col} dataKey={col} fill={colors[index]} />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      );
    }

    if (chartOptions.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            {chartOptions.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            {chartOptions.showLegend && <Legend />}
            {numericColumns.slice(0, 3).map((col: string, index: number) => (
              <Line key={col} type="monotone" dataKey={col} stroke={colors[index]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartOptions.type === 'pie') {
      const pieData = chartData.slice(0, 5).map((item: any, index: number) => ({
        name: item.name,
        value: Object.values(item).find(v => typeof v === 'number') as number || 0,
        fill: colors[index % colors.length]
      }));

      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              fill="#8884d8"
              label
            >
              {pieData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <RechartsTooltip />
            {chartOptions.showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const renderChartSettings = () => {
    if (!dashboardResult) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Settings sx={{ mr: 1 }} />
            차트 설정
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>차트 유형</InputLabel>
                <Select
                  value={chartOptions.type}
                  label="차트 유형"
                  onChange={(e) => setChartOptions(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="bar">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShowChart sx={{ mr: 1 }} /> 막대 차트
                    </Box>
                  </MenuItem>
                  <MenuItem value="line">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShowChart sx={{ mr: 1 }} /> 선 차트
                    </Box>
                  </MenuItem>
                  <MenuItem value="pie">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DonutSmall sx={{ mr: 1 }} /> 원형 차트
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>데이터 개수</InputLabel>
                <Select
                  value={chartOptions.dataLimit}
                  label="데이터 개수"
                  onChange={(e) => setChartOptions(prev => ({ ...prev, dataLimit: Number(e.target.value) }))}
                >
                  <MenuItem value={5}>5개</MenuItem>
                  <MenuItem value={10}>10개</MenuItem>
                  <MenuItem value={20}>20개</MenuItem>
                  <MenuItem value={50}>50개</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={chartOptions.showGrid}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, showGrid: e.target.checked }))}
                    />
                  }
                  label="그리드 표시"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={chartOptions.showLegend}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, showLegend: e.target.checked }))}
                    />
                  }
                  label="범례 표시"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderResultTabs = () => {
    if (!dashboardResult) return null;

    const tabLabels = ['MongoDB 쿼리', '데이터 컬럼', '샘플 데이터', '차트 분석'];

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">분석 결과</Typography>
            <Box>
              <Tooltip title="새로고침">
                <IconButton onClick={() => window.location.reload()}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>

          {/* MongoDB 쿼리 탭 */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Code sx={{ mr: 1 }} />
                생성된 MongoDB 쿼리
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px' }}>
                  {dashboardResult.mongodb_query}
                </pre>
              </Paper>
            </Box>
          )}

          {/* 데이터 컬럼 탭 */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TableChart sx={{ mr: 1 }} />
                데이터 컬럼 ({dashboardResult.columns.length}개)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {dashboardResult.columns.map((column: string, index: number) => (
                  <Chip
                    key={index}
                    label={column}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 샘플 데이터 탭 */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Visibility sx={{ mr: 1 }} />
                샘플 데이터 (상위 10개 / 전체 {dashboardResult.total_count}개)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {dashboardResult.columns.map((column: string) => (
                        <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardResult.sample_data.slice(0, 10).map((row: any, index: number) => (
                      <TableRow key={index}>
                        {dashboardResult.columns.map((column: string) => (
                          <TableCell key={column}>
                            {typeof row[column] === 'object'
                              ? JSON.stringify(row[column])
                              : String(row[column] || '-')
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* 차트 분석 탭 */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ShowChart sx={{ mr: 1 }} />
                데이터 시각화 및 통계 분석
              </Typography>
              {renderChart()}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleDownloadPDF = async () => {
    if (!analysis) return;
    
    try {
      if (isShared && sharedAnalysis) {
        // 공유 분석 PDF
        await exportSharedAnalysisToPDF(
          {
            query: analysis.query,
            result: analysis.result,
            title: analysis.title || analysis.query,
            createdAt: analysis.createdAt
          },
          {
            sharedBy: sharedAnalysis.sharedBy.name,
            department: sharedAnalysis.sharedBy.department,
            rating: sharedAnalysis.rating,
            usageCount: sharedAnalysis.usageCount
          },
          'analysis-detail-visualization'
        );
      } else {
        // 일반 분석 PDF
        await exportAnalysisToPDF(
          {
            query: analysis.query,
            result: analysis.result,
            title: analysis.title || analysis.query,
            createdAt: analysis.createdAt
          },
          'analysis-detail-visualization'
        );
      }
    } catch (error) {
      console.error('PDF 다운로드 오류:', error);
      setError('PDF 다운로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !analysis) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '분석을 찾을 수 없습니다.'}
        </Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          돌아가기
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">
            {cleanTitle(analysis.title || analysis.query)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            생성일: {new Date(analysis.createdAt).toLocaleString('ko-KR')}
          </Typography>
          {isShared && sharedAnalysis && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label="공유 분석" 
                color="primary" 
                size="small" 
                icon={<Share />} 
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24 }}>
                  {sharedAnalysis.sharedBy.name.charAt(0)}
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  {sharedAnalysis.sharedBy.name} ({sharedAnalysis.sharedBy.department})
                </Typography>
                <Chip 
                  label={`사용 횟수: ${sharedAnalysis.usageCount}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating 
                    value={sharedAnalysis.rating} 
                    readOnly 
                    size="small" 
                    precision={0.1} 
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({sharedAnalysis.rating.toFixed(1)})
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton title="결과 복사">
            <ContentCopy />
          </IconButton>
          <IconButton 
            onClick={handleDownloadPDF}
            title="결과 PDF 다운로드"
          >
            <Download />
          </IconButton>
          {!isShared && !isOwner && (
            <Button
              variant="outlined"
              startIcon={<Bookmark />}
              onClick={() => setSaveDialogOpen(true)}
            >
              내 분석으로 저장
            </Button>
          )}
          {isOwner && (
            <>
              <IconButton onClick={() => setEditDialogOpen(true)}>
                <Edit />
              </IconButton>
              <IconButton onClick={() => setDeleteDialogOpen(true)}>
                <Delete />
              </IconButton>
            </>
          )}
          <IconButton>
            <Share />
          </IconButton>
        </Box>
      </Box>

      {/* Analysis Content - DataAnalyticsDashboard 스타일과 동일하게 */}
      <Box>
        {/* DataAnalyticsDashboard 스타일 결과가 있는 경우 */}
        {dashboardResult ? (
          <Box>
            {/* 차트 설정 */}
            {renderChartSettings()}

            {/* 결과 탭 */}
            {renderResultTabs()}
          </Box>
        ) : (
          /* 기존 스타일 결과 */
          <Box>
            <Alert
              severity="success"
              sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                '& .MuiAlert-icon': { color: '#10b981' }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {isShared ? '공유된 ' : ''}전문 ML 모델 분석 완료
              </Typography>
            </Alert>

            <Card sx={{
              mb: 3,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUp sx={{ mr: 2, color: '#60a5fa' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                    ML 분석 결과
                  </Typography>
                </Box>
                <Paper sx={{
                  p: 3,
                  bgcolor: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <Box sx={{
                    fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
                    lineHeight: 1.7,
                    fontSize: '15px',
                    color: 'white',
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      color: '#f8fafc',
                      fontWeight: 600,
                      marginTop: '24px',
                      marginBottom: '12px'
                    },
                    '& h2': { fontSize: '20px', borderBottom: '2px solid #475569', paddingBottom: '8px' },
                    '& h3': { fontSize: '18px', color: '#cbd5e1' },
                    '& p': { marginBottom: '12px', color: '#e2e8f0' },
                    '& strong': { color: '#fbbf24', fontWeight: 600 },
                    '& ul, & ol': { paddingLeft: '20px', marginBottom: '12px' },
                    '& li': { marginBottom: '6px', color: '#e2e8f0' },
                    '& code': {
                      backgroundColor: 'rgba(51, 65, 85, 0.5)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: '#60a5fa'
                    }
                  }}>
                    <ReactMarkdown>{analysis.result?.analysis || '분석 결과가 없습니다.'}</ReactMarkdown>
                  </Box>
                </Paper>
              </CardContent>
            </Card>

            {analysis.result?.visualization && (
              <Card sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white', mb: 3 }}>
                    데이터 시각화
                  </Typography>
                  <VegaVisualization spec={analysis.result.visualization} />
                </CardContent>
              </Card>
            )}

            {analysis.result?.data && analysis.result.data.length > 0 && (
              <Card sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white', mb: 3 }}>
                    예측 데이터 (상위 5개)
                  </Typography>
                  <Box sx={{
                    overflowX: 'auto',
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{
                          background: 'linear-gradient(135deg, #334155 0%, #475569 100%)'
                        }}>
                          {Object.keys(analysis.result.data[0] || {}).map((key) => (
                            <th key={key} style={{
                              padding: '16px',
                              textAlign: 'left',
                              borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                              fontWeight: 600,
                              color: '#f8fafc',
                              fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
                              fontSize: '14px'
                            }}>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.result.data.slice(0, 5).map((row: any, idx: number) => (
                          <tr key={idx} style={{
                            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                            background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.3)' : 'rgba(30, 41, 59, 0.3)'
                          }}>
                            {Object.values(row).map((value: any, cellIdx: number) => (
                              <td key={cellIdx} style={{
                                padding: '14px 16px',
                                fontSize: '14px',
                                color: '#e2e8f0',
                                fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace'
                              }}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>분석 수정</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="제목"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="설명"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="태그 추가"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag}>추가</Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {editTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleEdit} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>분석 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 이 분석을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Copy Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>내 분석으로 저장</DialogTitle>
        <DialogContent>
          <Typography>
            이 분석을 내 분석 목록에 복사본으로 저장하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveCopy} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalysisDetailPage;