import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
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
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import {
  ImageSearch,
  Send,
  History,
  Collections,
  Image as ImageIcon,
  AutoAwesome,
  Refresh,
  ZoomIn,
  Download,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { searchImages, listImages, ImageResult as APIImageResult, SearchResult as APISearchResult } from '../services/imageSearch';

// API에서 가져온 타입 사용
type ImageResult = APIImageResult;
type SearchResult = APISearchResult;

const ImageSearchPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  // 추천 검색어 예시
  const suggestedQueries = [
    "여름 신상 원피스",
    "캐주얼 남성 티셔츠",
    "운동화 베스트셀러",
    "가을 아우터 추천",
    "미니멀 액세서리"
  ];

  // 컴포넌트 마운트 시 최근 검색 기록 로드 및 초기 이미지 로드
  useEffect(() => {
    if (user?.id) {
      loadRecentSearches();
      loadInitialImages();
    }
  }, [user]);

  const loadRecentSearches = async () => {
    try {
      // 로컬 스토리지에서 최근 검색 기록 불러오기
      const saved = localStorage.getItem('recentImageSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const loadInitialImages = async () => {
    try {
      setIsLoading(true);
      const initialImages = await listImages(12);
      setResult(initialImages);
    } catch (error) {
      console.error('Failed to load initial images:', error);
    } finally {
      setIsLoading(false);
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
      // 실제 API 호출
      const searchResult = await searchImages(query.trim());
      
      setResult(searchResult);
      setProgress(100);
      
      // 최근 검색 목록 업데이트
      const newSearch = { 
        id: Date.now().toString(), 
        query: query.trim(), 
        createdAt: new Date().toISOString() 
      };
      
      const updatedSearches = [
        newSearch,
        ...recentSearches.filter(s => s.query !== query.trim()).slice(0, 8)
      ];
      
      setRecentSearches(updatedSearches);
      
      // 로컬 스토리지에 저장
      localStorage.setItem('recentImageSearches', JSON.stringify(updatedSearches));
      
      // 입력 필드 초기화
      setQuery('');
    } catch (error: any) {
      setError(error.message || '이미지 검색 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery);
  };

  const handleImageClick = (image: ImageResult) => {
    setSelectedImage(image);
  };

  const handleDownload = (image: ImageResult) => {
    try {
      // filename을 직접 사용하여 다운로드 URL 생성
      const downloadUrl = `/api/images/download/${image.filename}`;
      
      // 새 창에서 다운로드 링크 열기
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = image.filename || `image_${image.id}.jpg`;
      a.target = '_blank';
      
      // 다운로드 실행
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      setError('이미지 다운로드에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <ImageSearch sx={{ mr: 2, color: 'primary.main' }} />
          이미지 검색
        </Typography>
        <Typography variant="body1" color="textSecondary">
          자연어로 검색하면 AI가 관련 이미지를 찾아드립니다
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 검색 입력 섹션 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Collections sx={{ mr: 1 }} />
                이미지 검색하기
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="예: 파란색 데님 재킷, 캐주얼한 스타일"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isLoading}
              />

              {isLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    AI가 이미지를 검색하고 있습니다... {Math.round(progress)}%
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
                  {isLoading ? '검색 중...' : '검색 시작'}
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

          {/* 추천 검색어 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AutoAwesome sx={{ mr: 1 }} />
                추천 검색어
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

          {/* 검색 결과 */}
          {result && (
            <Fade in={true}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      검색 결과 ({result.totalCount}개, {(result.searchTime || 0).toFixed(2)}초)
                    </Typography>
                  </Box>
                  
                  <ImageList sx={{ width: '100%', height: 'auto' }} cols={3} gap={16}>
                    {result.images.map((image) => (
                      <ImageListItem 
                        key={image.id}
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: 3,
                          },
                          height: '300px'
                        }}
                        onClick={() => handleImageClick(image)}
                      >
                        <img
                          src={image.url}
                          alt={image.title}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Image+Not+Found';
                          }}
                        />
                        <ImageListItemBar
                          title={image.title}
                          subtitle={
                            <span>
                              {image.description || `관련도: ${((image.relevance || 0) * 100).toFixed(0)}%`}
                            </span>
                          }
                          actionIcon={
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              aria-label={`info about ${image.title}`}
                            >
                              <ZoomIn />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>

                  {/* 선택된 이미지 상세 정보 */}
                  {selectedImage && (
                    <Paper sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <img 
                            src={selectedImage.url} 
                            alt={selectedImage.title}
                            style={{ width: '100%', height: 'auto', borderRadius: 8 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Image+Not+Found';
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Typography variant="h6" gutterBottom>
                            {selectedImage.title}
                          </Typography>
                          {selectedImage.description && (
                            <Typography variant="body2" color="textSecondary" paragraph>
                              {selectedImage.description}
                            </Typography>
                          )}
                          {selectedImage.tags && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                              {selectedImage.tags.map((tag, index) => (
                                <Chip key={index} label={tag} size="small" />
                              ))}
                            </Box>
                          )}
                          <Box sx={{ mt: 2 }}>
                            <Button 
                              startIcon={<Download />} 
                              size="small"
                              variant="contained"
                              onClick={() => handleDownload(selectedImage)}
                            >
                              다운로드
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* 최근 검색 기록 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                최근 검색 기록
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {recentSearches.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ py: 2 }}>
                  아직 검색 기록이 없습니다.
                </Typography>
              ) : (
                <List>
                  {recentSearches.map((item) => (
                    <ListItem 
                      key={item.id}
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
                        <ImageIcon color="primary" />
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

export default ImageSearchPage;