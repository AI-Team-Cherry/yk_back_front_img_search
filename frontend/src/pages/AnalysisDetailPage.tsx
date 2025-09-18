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
} from '@mui/icons-material';
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
      // 공유 분석인지 일반 분석인지 확인
      if (analysisId.startsWith('shared-')) {
        setIsShared(true);
        // 공유 분석 데이터 로드
        const sharedAnalyses = await getSharedAnalyses();
        const shared = sharedAnalyses.analyses.find(s => s.id === analysisId);
        
        if (shared) {
          setSharedAnalysis(shared);
          
          // 원본 분석 데이터도 로드
          try {
            const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
            const originalAnalysis = savedAnalyses.find((a: any) => a.id === shared.originalAnalysisId);
            
            if (originalAnalysis) {
              // 문자열로 저장된 Date를 Date 객체로 변환
              const analysis: Analysis = {
                ...originalAnalysis,
                createdAt: new Date(originalAnalysis.createdAt),
                updatedAt: new Date(originalAnalysis.updatedAt)
              };
              setAnalysis(analysis);
              setEditTitle(analysis.title || analysis.query);
              setEditDescription(analysis.description || '');
              setEditTags(analysis.tags || []);
            }
          } catch (error) {
            console.error('Failed to load original analysis:', error);
          }
        } else {
          throw new Error('공유 분석을 찾을 수 없습니다.');
        }
      } else {
        // 일반 분석 로드
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);
        setEditTitle(data.title || data.query);
        setEditDescription(data.description || '');
        setEditTags(data.tags || []);
      }
    } catch (err: any) {
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
            {analysis.title || analysis.query}
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

      {/* Analysis Content - SmartAnalysisPage 스타일과 동일하게 */}
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
                <ReactMarkdown>{analysis.result.analysis}</ReactMarkdown>
              </Box>
            </Paper>
          </CardContent>
        </Card>

        {analysis.result.visualization && (
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
                id="analysis-detail-visualization"
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
                    ...analysis.result.visualization,
                    width: 680,
                    height: 420,
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    padding: { left: 60, right: 30, top: 20, bottom: 40 },
                    config: {
                      ...analysis.result.visualization.config,
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

        {analysis.result.data && analysis.result.data.length > 0 && (
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

        {analysis.result.model_status && (
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
                  label={`상태: ${analysis.result.model_status.status}`}
                  sx={{
                    background: analysis.result.model_status.status === 'ready' 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    fontWeight: 600,
                    border: 'none',
                    '& .MuiChip-label': { fontFamily: '"SF Pro Display", system-ui, sans-serif' }
                  }}
                />
                <Chip 
                  label={`모델: ${analysis.result.model_status.model}`}
                  sx={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontWeight: 600,
                    border: 'none',
                    '& .MuiChip-label': { fontFamily: '"SF Pro Display", system-ui, sans-serif' }
                  }}
                />
                <Chip 
                  label={`타입: ${analysis.result.model_status.type}`}
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

        {analysis.result.prediction_basis && (
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
                  {analysis.result.prediction_basis}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
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