import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Fade,
  LinearProgress,
} from '@mui/material';
import {
  Psychology,
  Send,
  History,
  TrendingUp,
  QueryStats,
  AutoAwesome,
  Refresh,
  ContentCopy,
  Download,
  Share,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { executeQuery, getAnalysisResults, QueryResponse } from '../services/aiQuery';
import { submitQuery, shareAnalysis, saveAnalysis } from '../services/analytics';
import { AnalysisResult as MLAnalysisResult } from '../types';
import { VegaEmbed } from 'react-vega';
import ReactMarkdown from 'react-markdown';
import { exportAnalysisToPDF } from '../utils/pdfExport';

const SmartAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | MLAnalysisResult | null>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // 추천 질의 예시
  const suggestedQueries = [
    "신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘",
    "이탈 위험 높은데 쿠폰 주면 돌아올 확률 큰 고객만 골라줘",
    "이번 주에 상의/하의 각 5% 가격 인하하면 예측 판매량이 얼마나 늘까?",
    "장바구니에 담고 나간 사람 중 48시간 내 결제할 가능성 높은 사용자만 알려줘",
    "브랜드 신뢰도가 높아 재구매로 이어질 확률 큰 브랜드 톱5는 어디야?"
  ];

  // 컴포넌트 마운트 시 최근 분석 결과 로드
  useEffect(() => {
    if (user?.id) {
      loadRecentQueries();
    }
  }, [user]);

  const loadRecentQueries = async () => {
    try {
      if (user?.id) {
        const results = await getAnalysisResults(user.id, 10);
        setRecentQueries(results);
      }
    } catch (error) {
      console.error('Failed to load recent queries:', error);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim() || !user?.id) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);

    // 진행률 시뮬레이션
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      const queryData = {
        userId: user.id,
        query: query.trim(),
      };

      const response = await executeQuery(queryData);
      setResult(response);
      setProgress(100);
      
      // 최근 질의 목록 새로고침
      await loadRecentQueries();
      
      // 입력 필드 초기화
      setQuery('');
    } catch (error: any) {
      setError(error.message || 'AI 분석 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = async (suggestedQuery: string) => {
    setQuery(suggestedQuery);
    // 추천 질의 클릭 시 바로 분석 실행
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      console.log('🚀 추천 질의 실행:', suggestedQuery);
      const response = await submitQuery({ query: suggestedQuery });
      console.log('📊 추천 질의 응답:', response);
      setResult(response);
      setProgress(100);
      
      // 최근 쿼리에 추가
      if (user?.id) {
        const newQuery = {
          id: Date.now().toString(),
          userId: user.id,
          query: suggestedQuery,
          result: response,
          createdAt: new Date().toISOString(),
          isPublic: false,
          tags: []
        };
        setRecentQueries(prev => [newQuery, ...prev.slice(0, 4)]);
      }
      
      setQuery('');
    } catch (error: any) {
      setError(error.message || 'AI 분석 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    
    try {
      await exportAnalysisToPDF({
        query: query || '분석 결과',
        result: result as MLAnalysisResult,
        title: query || '분석 결과',
        createdAt: new Date()
      }, 'analysis-result-visualization'); // 시각화 요소 ID
    } catch (error) {
      console.error('PDF 다운로드 오류:', error);
      setError('PDF 다운로드 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const handleShareAnalysis = async () => {
    if (!result || !user?.id) return;
    
    setShareLoading(true);
    try {
      // 먼저 분석을 저장
      const savedAnalysis = await saveAnalysis({
        query: query || '분석 결과',
        result: result as MLAnalysisResult,
        title: query || '분석 결과',
        description: '스마트 AI 분석 결과',
        tags: ['AI분석', '공유'],
        isPublic: true
      });
      
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (error) {
      console.error('분석 공유 중 오류:', error);
      setError('분석 공유 중 오류가 발생했습니다.');
    } finally {
      setShareLoading(false);
    }
  };

  const renderResultSection = (title: string, content: any, icon: React.ReactNode) => {
    if (!content) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {title}
            </Typography>
          </Box>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </pre>
          </Paper>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Psychology sx={{ mr: 2, color: 'primary.main' }} />
          스마트 AI 분석
        </Typography>
        <Typography variant="body1" color="textSecondary">
          자연어로 질문하면 AI가 데이터를 분석하고 인사이트를 제공합니다
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 질의 입력 섹션 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <QueryStats sx={{ mr: 1 }} />
                AI에게 질문하기
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="예: 최근 한 달간 가장 인기있는 상품 카테고리는 무엇인가요?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isLoading}
              />

              {isLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    AI가 데이터를 분석하고 있습니다... {Math.round(progress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  sx={{ px: 4 }}
                >
                  {isLoading ? '분석 중...' : '분석 시작'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setQuery('')}
                  disabled={isLoading}
                >
                  초기화
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 추천 질의 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AutoAwesome sx={{ mr: 1 }} />
                추천 질의
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {suggestedQueries.map((suggested, index) => (
                  <Chip
                    key={index}
                    label={suggested}
                    onClick={() => handleSuggestedQuery(suggested)}
                    variant="outlined"
                    sx={{ mb: 1 }}
                    disabled={isLoading}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* 오류 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {shareSuccess && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setShareSuccess(false)}>
              분석 결과가 성공적으로 공유되었습니다! 공유 분석 메뉴에서 확인할 수 있습니다.
            </Alert>
          )}

          {/* 분석 결과 */}
          {result && (
            <Fade in={true}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">분석 결과</Typography>
                    <Box>
                      <IconButton 
                        onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                        title="결과 복사"
                      >
                        <ContentCopy />
                      </IconButton>
                      <IconButton 
                        onClick={handleDownloadPDF}
                        title="결과 PDF 다운로드"
                      >
                        <Download />
                      </IconButton>
                      <IconButton 
                        onClick={handleShareAnalysis}
                        disabled={shareLoading}
                        title="분석 결과 공유"
                        sx={{
                          color: shareSuccess ? '#10b981' : 'inherit',
                          '&:disabled': { opacity: 0.6 }
                        }}
                      >
                        {shareLoading ? <CircularProgress size={20} /> : <Share />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {/* ML 결과인지 기존 QueryResponse인지 확인 */}
                  {(result as any).analysis ? (
                    // ML 분석 결과 (AnalysisResult 타입)
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
                          전문 ML 모델 분석 완료
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
                              <ReactMarkdown>{(result as any).analysis}</ReactMarkdown>
                            </Box>
                          </Paper>
                        </CardContent>
                      </Card>

                      {(result as any).visualization && (
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
                            <Box 
                              id="analysis-result-visualization"
                              sx={{ 
                                width: '100%', 
                                height: '450px',
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'visible'
                              }}
                            >
                              <VegaEmbed 
                                spec={{
                                  ...(result as any).visualization,
                                  width: 680,
                                  height: 420,
                                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                  padding: { left: 60, right: 30, top: 20, bottom: 40 },
                                  config: {
                                    ...(result as any).visualization.config,
                                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                    title: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
                                    axis: {
                                      labelColor: '#cbd5e1',
                                      titleColor: '#e2e8f0',
                                      domainColor: '#475569',
                                      tickColor: '#475569',
                                      gridColor: '#334155',
                                      labelFontSize: 12,
                                      titleFontSize: 14
                                    },
                                    legend: {
                                      labelColor: '#cbd5e1',
                                      titleColor: '#e2e8f0',
                                      labelFontSize: 12,
                                      titleFontSize: 14
                                    },
                                    view: { stroke: 'transparent' }
                                  }
                                }} 
                                options={{ actions: false }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      )}

                      {(result as any).data && (result as any).data.length > 0 && (
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
                                    {Object.keys((result as any).data[0] || {}).map((key) => (
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
                                  {(result as any).data.slice(0, 5).map((row: any, idx: number) => (
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

                      {(result as any).model_status && (
                        <Card sx={{ 
                          mb: 3, 
                          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                          color: 'white',
                          boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(148, 163, 184, 0.1)'
                        }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white', mb: 3 }}>
                              모델 상태
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              <Chip 
                                label={`상태: ${(result as any).model_status.status}`}
                                sx={{
                                  background: (result as any).model_status.status === 'ready' 
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  border: 'none',
                                  '& .MuiChip-label': { fontFamily: '"SF Pro Display", system-ui, sans-serif' }
                                }}
                              />
                              <Chip 
                                label={`모델: ${(result as any).model_status.model}`}
                                sx={{
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  border: 'none',
                                  '& .MuiChip-label': { fontFamily: '"SF Pro Display", system-ui, sans-serif' }
                                }}
                              />
                              <Chip 
                                label={`타입: ${(result as any).model_status.type}`}
                                sx={{
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  border: 'none',
                                  '& .MuiChip-label': { fontFamily: '"SF Pro Display", system-ui, sans-serif' }
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      )}

                      {(result as any).prediction_basis && (
                        <Card sx={{ 
                          mb: 3, 
                          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                          color: 'white',
                          boxShadow: '0 8px 32px rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(148, 163, 184, 0.1)'
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <QueryStats sx={{ mr: 2, color: '#a855f7' }} />
                              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                                예측 근거
                              </Typography>
                            </Box>
                            <Paper sx={{ 
                              p: 3, 
                              bgcolor: 'rgba(15, 23, 42, 0.8)', 
                              color: 'white',
                              border: '1px solid rgba(148, 163, 184, 0.1)'
                            }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap', 
                                  fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
                                  lineHeight: 1.7,
                                  fontSize: '14px'
                                }}
                              >
                                {(result as any).prediction_basis}
                              </Typography>
                            </Paper>
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  ) : (
                    // 기존 QueryResponse 결과
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>질의:</strong> {(result as any).query}
                      </Alert>

                      {renderResultSection(
                        'AI 분석 결과',
                        (result as any).ai_analysis,
                        <TrendingUp color="primary" />
                      )}

                      {renderResultSection(
                        'MongoDB 쿼리 결과',
                        (result as any).mongodb_results,
                        <QueryStats color="secondary" />
                      )}

                      {renderResultSection(
                        '벡터 검색 결과',
                        (result as any).vector_results,
                        <Psychology color="success" />
                      )}

                      {(result as any).visualizations && (result as any).visualizations.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              시각화
                            </Typography>
                            {(result as any).visualizations.map((viz: any, index: number) => (
                              <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                  {JSON.stringify(viz, null, 2)}
                                </pre>
                              </Paper>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* 최근 분석 이력 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                최근 분석 이력
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {recentQueries.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                  아직 분석 이력이 없습니다.
                </Typography>
              ) : (
                <List>
                  {recentQueries.map((item, index) => (
                    <ListItem 
                      key={item._id || item.id || `query-${index}`} 
                      sx={{ 
                        px: 0, 
                        py: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1
                      }}
                      onClick={() => setQuery(item.query)}
                    >
                      <ListItemIcon>
                        <QueryStats color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {item.query}
                          </Typography>
                        }
                        secondary={formatDate(item.createdAt)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SmartAnalysisPage;