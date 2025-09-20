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
  Tabs,
  Tab,
  styled,
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
  CloudUpload,
  PhotoCamera,
  Clear,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { searchImages, searchImagesByFile, listImages, ImageResult as APIImageResult, SearchResult as APISearchResult } from '../services/imageSearch';

// API에서 가져온 타입 사용
type ImageResult = APIImageResult;
type SearchResult = APISearchResult;

// 스타일 컴포넌트
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const ImagePreviewBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  textAlign: 'center',
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  minHeight: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
}));

const ImageSearchPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');

  // 추천 검색어 예시
  const suggestedQueries = [
    "여름 신상 원피스",
    "캐주얼 남성 티셔츠",
    "운동화 베스트셀러",
    "가을 아우터 추천",
    "미니멀 액세서리"
  ];

  // 컴포넌트 마운트 시 최근 검색 기록만 로드
  useEffect(() => {
    if (user?.id) {
      loadRecentSearches();
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


  const handleSubmit = async () => {
    if (searchMode === 'text' && (!query.trim() || !user?.id)) return;
    if (searchMode === 'image' && (!uploadedImage || !user?.id)) return;

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
      let searchResult;

      if (searchMode === 'text') {
        // 텍스트 검색
        searchResult = await searchImages(query.trim());

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
        localStorage.setItem('recentImageSearches', JSON.stringify(updatedSearches));
        setQuery('');
      } else {
        // 이미지 검색
        searchResult = await searchImagesByFile(uploadedImage!);

        // 최근 검색 목록 업데이트 (이미지 이름 사용)
        const newSearch = {
          id: Date.now().toString(),
          query: `이미지: ${uploadedImage!.name}`,
          createdAt: new Date().toISOString()
        };

        const updatedSearches = [
          newSearch,
          ...recentSearches.slice(0, 8)
        ];

        setRecentSearches(updatedSearches);
        localStorage.setItem('recentImageSearches', JSON.stringify(updatedSearches));
      }

      setResult(searchResult);
      setProgress(100);
      setHasSearched(true);
    } catch (error: any) {
      setError(error.message || '이미지 검색 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setSearchMode('image');
    } else {
      setError('이미지 파일만 업로드할 수 있습니다.');
    }
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setUploadedImagePreview(null);
    setSearchMode('text');
  };

  const handleModeSwitch = (mode: 'text' | 'image') => {
    setSearchMode(mode);
    setError(null);
    if (mode === 'text') {
      setUploadedImage(null);
      setUploadedImagePreview(null);
    } else {
      setQuery('');
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
          {searchMode === 'text'
            ? '자연어로 검색하면 AI가 관련 이미지를 찾아드립니다'
            : '이미지를 첨부하면 유사한 이미지를 찾아드립니다'
          }
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

              {/* 검색 모드 탭 */}
              <Tabs
                value={searchMode}
                onChange={(_, newValue) => handleModeSwitch(newValue)}
                sx={{ mb: 3 }}
              >
                <Tab
                  value="text"
                  label="텍스트 검색"
                  icon={<ImageSearch />}
                  iconPosition="start"
                />
                <Tab
                  value="image"
                  label="이미지 검색"
                  icon={<PhotoCamera />}
                  iconPosition="start"
                />
              </Tabs>

              {searchMode === 'text' ? (
                // 텍스트 검색 입력
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
              ) : (
                // 이미지 업로드 영역
                <Box sx={{ mb: 2 }}>
                  {!uploadedImagePreview ? (
                    <ImagePreviewBox>
                      <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        검색할 이미지를 업로드하세요
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        JPG, PNG, GIF 파일을 지원합니다
                      </Typography>
                      <Button
                        component="label"
                        variant="contained"
                        startIcon={<CloudUpload />}
                        disabled={isLoading}
                      >
                        이미지 선택
                        <VisuallyHiddenInput
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </Button>
                    </ImagePreviewBox>
                  ) : (
                    <ImagePreviewBox>
                      <Box sx={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                        <img
                          src={uploadedImagePreview}
                          alt="Upload preview"
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 8,
                            maxHeight: 250,
                            objectFit: 'contain'
                          }}
                        />
                        <IconButton
                          onClick={handleClearImage}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            backgroundColor: 'background.paper',
                            boxShadow: 1,
                            '&:hover': {
                              backgroundColor: 'background.paper',
                            }
                          }}
                          size="small"
                        >
                          <Clear />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {uploadedImage?.name}
                      </Typography>
                    </ImagePreviewBox>
                  )}
                </Box>
              )}

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
                  disabled={
                    (searchMode === 'text' && !query.trim()) ||
                    (searchMode === 'image' && !uploadedImage) ||
                    isLoading
                  }
                  sx={{ px: 4 }}
                >
                  {isLoading ? '검색 중...' : '검색 시작'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={searchMode === 'text' ? () => setQuery('') : handleClearImage}
                  disabled={isLoading}
                >
                  초기화
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 추천 검색어 - 텍스트 검색 모드일 때만 표시 */}
          {searchMode === 'text' && (
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
          )}

          {/* 오류 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 검색 결과 */}
          {result && hasSearched && (
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