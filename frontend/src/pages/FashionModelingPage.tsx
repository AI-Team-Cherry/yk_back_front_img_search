import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Fade,
  LinearProgress,
  styled,
  Divider,
} from '@mui/material';
import {
  PersonAdd,
  Checkroom,
  PhotoCamera,
  CloudUpload,
  Clear,
  AutoAwesome,
  Download,
  Refresh,
  Send,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

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

const ClothingSlot = styled(Box)(({ theme }) => ({
  border: `1px dashed ${theme.palette.grey[400]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  textAlign: 'center',
  backgroundColor: theme.palette.grey[50],
  position: 'relative',
  minHeight: 150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
}));

interface UploadedImage {
  file: File;
  preview: string;
}

const FashionModelingPage: React.FC = () => {
  const { user } = useAuth();
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [clothingImages, setClothingImages] = useState<(UploadedImage | null)[]>([null, null, null, null]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleModelImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setModelImage({
          file,
          preview: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    } else {
      setError('이미지 파일만 업로드할 수 있습니다.');
    }
  };

  const handleClothingImageUpload = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newClothingImages = [...clothingImages];
        newClothingImages[index] = {
          file,
          preview: e.target?.result as string
        };
        setClothingImages(newClothingImages);
      };
      reader.readAsDataURL(file);
    } else {
      setError('이미지 파일만 업로드할 수 있습니다.');
    }
  };

  const handleClearModelImage = () => {
    setModelImage(null);
  };

  const handleClearClothingImage = (index: number) => {
    const newClothingImages = [...clothingImages];
    newClothingImages[index] = null;
    setClothingImages(newClothingImages);
  };

  const handleSubmit = async () => {
    if (!modelImage || !user?.id) return;

    const clothingFiles = clothingImages.filter(img => img !== null) as UploadedImage[];
    if (clothingFiles.length === 0) {
      setError('최소 하나의 의류 이미지가 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    // 진행률 시뮬레이션
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('model_image', modelImage.file);

      clothingFiles.forEach((clothingImg, index) => {
        formData.append(`clothing_${index + 1}`, clothingImg.file);
      });

      if (customPrompt.trim()) {
        formData.append('custom_prompt', customPrompt.trim());
      }

      const response = await fetch('/api/images/compose-fashion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '패션 이미지 합성에 실패했습니다.');
      }

      const resultData = await response.json();
      setResult(resultData);
      setProgress(100);

    } catch (error: any) {
      setError(error.message || '패션 이미지 합성 중 오류가 발생했습니다.');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setModelImage(null);
    setClothingImages([null, null, null, null]);
    setCustomPrompt('');
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const getUploadedClothingCount = () => {
    return clothingImages.filter(img => img !== null).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AutoAwesome sx={{ mr: 2, color: 'primary.main' }} />
          AI 패션 모델링
        </Typography>
        <Typography variant="body1" color="textSecondary">
          모델 사진에 원하는 옷을 착용시켜보세요. 최대 4개의 의류 아이템을 조합할 수 있습니다.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 이미지 업로드 섹션 */}
        <Grid item xs={12} md={8}>
          {/* 모델 이미지 업로드 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonAdd sx={{ mr: 1 }} />
                모델 이미지 업로드
              </Typography>

              {!modelImage ? (
                <ImagePreviewBox>
                  <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    모델 사진을 업로드하세요
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    전신 사진을 권장합니다
                  </Typography>
                  <Button
                    component="label"
                    variant="contained"
                    startIcon={<CloudUpload />}
                    disabled={isLoading}
                  >
                    모델 이미지 선택
                    <VisuallyHiddenInput
                      type="file"
                      accept="image/*"
                      onChange={handleModelImageUpload}
                    />
                  </Button>
                </ImagePreviewBox>
              ) : (
                <ImagePreviewBox>
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                    <img
                      src={modelImage.preview}
                      alt="Model preview"
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: 8,
                        maxHeight: 400,
                        objectFit: 'contain'
                      }}
                    />
                    <IconButton
                      onClick={handleClearModelImage}
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
                    {modelImage.file.name}
                  </Typography>
                </ImagePreviewBox>
              )}
            </CardContent>
          </Card>

          {/* 의류 이미지 업로드 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkroom sx={{ mr: 1 }} />
                의류 이미지 업로드 ({getUploadedClothingCount()}/4)
              </Typography>

              <Grid container spacing={2}>
                {clothingImages.map((clothingImg, index) => (
                  <Grid item xs={6} md={3} key={index}>
                    <ClothingSlot>
                      {!clothingImg ? (
                        <>
                          <Checkroom sx={{ fontSize: 24, color: 'text.secondary', mb: 1 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                            의류 {index + 1}
                          </Typography>
                          <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            disabled={isLoading}
                          >
                            추가
                            <VisuallyHiddenInput
                              type="file"
                              accept="image/*"
                              onChange={handleClothingImageUpload(index)}
                            />
                          </Button>
                        </>
                      ) : (
                        <Box sx={{ position: 'relative', width: '100%' }}>
                          <img
                            src={clothingImg.preview}
                            alt={`Clothing ${index + 1}`}
                            style={{
                              width: '100%',
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 4
                            }}
                          />
                          <IconButton
                            onClick={() => handleClearClothingImage(index)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
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
                      )}
                    </ClothingSlot>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* 사용자 정의 프롬프트 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                추가 옵션 (선택사항)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="특별한 요청사항이나 스타일 지시사항을 입력하세요. 예: '캐주얼한 스타일로', '정장 느낌으로' 등"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isLoading}
                sx={{ mb: 2 }}
              />

              {isLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    AI가 패션 이미지를 합성하고 있습니다... {Math.round(progress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
                  onClick={handleSubmit}
                  disabled={!modelImage || getUploadedClothingCount() === 0 || isLoading}
                  sx={{ px: 4 }}
                >
                  {isLoading ? '패션 합성 중...' : 'AI 패션 합성 시작'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  전체 초기화
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 오류 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 결과 */}
          {result && (
            <Fade in={true}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    합성 결과
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
                          합성된 이미지
                        </Typography>

                        {/* 생성된 이미지 표시 */}
                        {result.image_url ? (
                          <Box sx={{ mb: 3, textAlign: 'center' }}>
                            <img
                              src={result.image_url}
                              alt="합성된 패션 이미지"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 400,
                                borderRadius: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              }}
                            />
                            <Box sx={{ mt: 2 }}>
                              <Button
                                variant="contained"
                                startIcon={<Download />}
                                href={result.image_url}
                                download="fashion_composition.jpg"
                                target="_blank"
                              >
                                이미지 다운로드
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{
                            backgroundColor: 'grey.100',
                            p: 3,
                            borderRadius: 1,
                            textAlign: 'center',
                            minHeight: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                          }}>
                            <Typography color="text.secondary">
                              합성된 이미지가 여기에 표시됩니다
                            </Typography>
                          </Box>
                        )}

                        {/* AI 합성 설명 */}
                        {result.analysis && (
                          <>
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                              AI 합성 설명:
                            </Typography>
                            <Box sx={{
                              backgroundColor: 'grey.900',  // 어두운 회색 배경
                              p: 2,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.700',
                              mb: 2
                            }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.6,
                                  color: 'grey.100'  // 밝은 회색 텍스트
                                }}
                              >
                                {result.analysis}
                              </Typography>
                            </Box>
                          </>
                        )}

                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>모델 이미지:</strong> {result.model_image}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>의류 개수:</strong> {result.clothing_count}개
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>처리 시간:</strong> {result.processing_time}
                          </Typography>
                          <Typography variant="body2">
                            <strong>상태:</strong> {result.message}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* 가이드 섹션 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                사용 가이드
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom color="primary">
                1. 모델 이미지 준비
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • 전신이 나온 깔끔한 사진<br/>
                • 정면을 향한 포즈 권장<br/>
                • 배경이 단순한 사진
              </Typography>

              <Typography variant="subtitle2" gutterBottom color="primary">
                2. 의류 이미지 준비
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • 의류만 나온 깔끔한 사진<br/>
                • 최대 4개까지 조합 가능<br/>
                • 상의, 하의, 신발, 액세서리 등
              </Typography>

              <Typography variant="subtitle2" gutterBottom color="primary">
                3. 합성 결과
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • AI가 자연스럽게 의류를 착용<br/>
                • 모델의 포즈와 얼굴 유지<br/>
                • 고품질 패션 사진 생성
              </Typography>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>팁:</strong> 더 나은 결과를 위해 고화질 이미지를 사용하고,
                  의류의 색상과 스타일이 잘 보이는 사진을 선택하세요.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FashionModelingPage;