import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import {
  Close,
  Download,
  Share,
  Favorite,
} from '@mui/icons-material';
import AnalysisCard from './AnalysisCard';

interface ImageDetailModalProps {
  open: boolean;
  onClose: () => void;
  image: {
    id: string;
    filename: string;
    url: string;
    title: string;
    description?: string;
    tags?: string[];
    relevance?: number;
    similarity?: number;
    product_name?: string;
    price?: number;
    rating_avg?: number;
    brand?: string;
    detailed_analysis?: any;
  } | null;
  onDownload?: (image: any) => void;
}

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  open,
  onClose,
  image,
  onDownload,
}) => {
  if (!image) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(image);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          margin: 2,
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" component="div">
            상품 상세 정보
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {image.product_name || image.title}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* 이미지 섹션 */}
          <Grid item xs={12} md={5}>
            <Box sx={{ position: 'relative' }}>
              <img
                src={image.url}
                alt={image.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 8,
                  maxHeight: '500px',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x500?text=Image+Not+Found';
                }}
              />
              
              {/* 이미지 오버레이 정보 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 1,
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                {image.similarity && (
                  <Chip
                    label={`유사도 ${(image.similarity * 100).toFixed(1)}%`}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                  />
                )}
                {image.detailed_analysis?.overall_rating?.grade && (
                  <Chip
                    label={`${image.detailed_analysis.overall_rating.grade}급`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(76, 175, 80, 0.8)', 
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* 기본 정보 */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {image.product_name || image.title}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {image.brand && (
                  <Chip label={image.brand} size="small" />
                )}
                {image.price && (
                  <Chip 
                    label={`${image.price.toLocaleString()}원`} 
                    size="small" 
                    color="primary" 
                  />
                )}
                {image.rating_avg && (
                  <Chip 
                    label={`평점 ${image.rating_avg}점`} 
                    size="small" 
                    color="secondary" 
                  />
                )}
              </Box>

              {image.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {image.description}
                </Typography>
              )}

              {image.tags && image.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    태그
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {image.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 파일 정보 */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  파일명: {image.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  관련도: {((image.relevance || 0) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 분석 정보 섹션 */}
          <Grid item xs={12} md={7}>
            {image.detailed_analysis ? (
              <AnalysisCard 
                analysis={image.detailed_analysis}
                productName={image.product_name}
                brand={image.brand}
              />
            ) : (
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'background.default', 
                borderRadius: 2 
              }}>
                <Typography variant="body1" color="text.secondary">
                  상세 분석 정보가 없습니다.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          startIcon={<Share />}
          onClick={() => {
            // 공유 기능 구현
            if (navigator.share) {
              navigator.share({
                title: image.product_name || image.title,
                text: image.description,
                url: window.location.href,
              });
            } else {
              // 클립보드에 복사
              navigator.clipboard.writeText(`${image.product_name || image.title} - ${image.url}`);
            }
          }}
        >
          공유
        </Button>
        <Button
          startIcon={<Favorite />}
          onClick={() => {
            // 즐겨찾기 기능 구현 (로컬 스토리지 활용)
            const favorites = JSON.parse(localStorage.getItem('favoriteImages') || '[]');
            const newFavorites = [...favorites, image.id];
            localStorage.setItem('favoriteImages', JSON.stringify(newFavorites));
          }}
        >
          즐겨찾기
        </Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleDownload}
        >
          다운로드
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDetailModal;
