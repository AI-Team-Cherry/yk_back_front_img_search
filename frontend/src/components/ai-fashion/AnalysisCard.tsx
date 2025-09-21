import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Paper,
  Rating,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Star,
  AttachMoney,
  People,
  Visibility,
  Favorite,
  Business,
  Grade,
  Speed,
  EmojiEvents,
  AutoAwesome,
} from '@mui/icons-material';

interface DetailedAnalysis {
  popularity: {
    score: {
      score: number;
      level: string;
      breakdown: {
        hearts_score: number;
        views_score: number;
        reviews_score: number;
      };
    };
    hearts: number;
    views_1m: number;
    reviews_count: number;
  };
  price_analysis: {
    segment: string;
    description: string;
    price: number;
    formatted_price: string;
    value_score: number;
  };
  quality_indicators: {
    rating: number;
    rating_score: number;
    review_reliability: string;
    quality_expectation: string;
    reviews_count: number;
  };
  trend_status: {
    score: number;
    status: string;
    description: string;
  };
  brand_analysis: {
    brand: string;
    positioning: string;
    description: string;
    price_fit: string;
  };
  competitiveness: {
    score: number;
    level: string;
    factors: {
      similarity: number;
      price_competitiveness: number;
      quality: number;
    };
  };
  recommendation_reasons: string[];
  overall_rating: {
    score: number;
    grade: string;
  };
}

interface AnalysisCardProps {
  analysis: DetailedAnalysis;
  productName?: string;
  brand?: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, productName, brand }) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return '#FFD700';
      case 'A': return '#FF6B6B';
      case 'B': return '#4ECDC4';
      case 'C': return '#45B7D1';
      case 'D': return '#96CEB4';
      default: return '#95A5A6';
    }
  };

  const getTrendIcon = (status: string) => {
    if (status.includes('상승')) return <TrendingUp color="success" />;
    if (status.includes('하락')) return <TrendingDown color="error" />;
    return <Speed color="primary" />;
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case '매우 높음': return 'success';
      case '높음': return 'info';
      case '보통': return 'warning';
      case '낮음': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ mb: 2, boxShadow: 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
            AI 상품 분석
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEvents sx={{ color: getGradeColor(analysis.overall_rating.grade) }} />
            <Typography 
              variant="h5" 
              sx={{ 
                color: getGradeColor(analysis.overall_rating.grade),
                fontWeight: 'bold'
              }}
            >
              {analysis.overall_rating.grade}급
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ({analysis.overall_rating.score.toFixed(1)}점)
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* 인기도 분석 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 1 }} />
                인기도 분석
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">종합 점수</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analysis.popularity.score.score.toFixed(1)}점 ({analysis.popularity.score.level})
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.popularity.score.score} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Favorite color="error" />
                    <Typography variant="caption" display="block">
                      {analysis.popularity.hearts}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Visibility color="primary" />
                    <Typography variant="caption" display="block">
                      {analysis.popularity.views_1m.toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Star color="warning" />
                    <Typography variant="caption" display="block">
                      {analysis.popularity.reviews_count}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* 가격 분석 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ mr: 1 }} />
                가격 분석
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="primary">
                  {analysis.price_analysis.formatted_price}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.price_analysis.segment} ({analysis.price_analysis.description})
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">가성비 점수</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analysis.price_analysis.value_score.toFixed(1)}점
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.price_analysis.value_score} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* 품질 지표 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Grade sx={{ mr: 1 }} />
                품질 지표
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Rating value={analysis.quality_indicators.rating} precision={0.1} readOnly />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {analysis.quality_indicators.rating}점
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">품질 점수</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analysis.quality_indicators.rating_score.toFixed(1)}점
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.quality_indicators.rating_score} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              
              <Chip 
                label={analysis.quality_indicators.quality_expectation}
                size="small"
                color={getReliabilityColor(analysis.quality_indicators.review_reliability)}
                sx={{ mt: 1 }}
              />
            </Paper>
          </Grid>

          {/* 트렌드 상태 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                {getTrendIcon(analysis.trend_status.status)}
                <Typography sx={{ ml: 1 }}>트렌드 상태</Typography>
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 1 }}>
                {analysis.trend_status.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {analysis.trend_status.description}
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">트렌드 점수</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analysis.trend_status.score.toFixed(1)}점
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.trend_status.score} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* 브랜드 분석 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Business sx={{ mr: 1 }} />
                브랜드 분석
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 1 }}>
                {analysis.brand_analysis.brand}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {analysis.brand_analysis.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={analysis.brand_analysis.positioning} size="small" />
                <Chip label={analysis.brand_analysis.price_fit} size="small" variant="outlined" />
              </Box>
            </Paper>
          </Grid>

          {/* 경쟁력 분석 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                경쟁력 분석
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">종합 경쟁력</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analysis.competitiveness.score.toFixed(1)}점 ({analysis.competitiveness.level})
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.competitiveness.score} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" display="block" textAlign="center">
                    유사도
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    {analysis.competitiveness.factors.similarity.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" display="block" textAlign="center">
                    가격 경쟁력
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    {analysis.competitiveness.factors.price_competitiveness.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" display="block" textAlign="center">
                    품질
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    {analysis.competitiveness.factors.quality.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* 추천 이유 */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                추천 이유
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {analysis.recommendation_reasons.map((reason, index) => (
                  <Chip 
                    key={index} 
                    label={reason} 
                    color="primary" 
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AnalysisCard;
