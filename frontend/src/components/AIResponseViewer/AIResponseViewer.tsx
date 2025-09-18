import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Lightbulb as InsightIcon,
  TrendingUp as RecommendIcon,
  DataObject as DataIcon,
  BarChart as ChartIcon,
  Psychology as AIIcon,
  Storage as DatabaseIcon,
} from '@mui/icons-material';
import { VegaEmbed } from 'react-vega';
import { AIResponse, ProductData, VegaLiteSpec } from '../../types';

interface AIResponseViewerProps {
  response: AIResponse;
  loading?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`response-tabpanel-${index}`}
      aria-labelledby={`response-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AIResponseViewer: React.FC<AIResponseViewerProps> = ({ response, loading }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  // AI 분석 결과를 섹션별로 파싱
  const parseAIAnalysis = (answer: string) => {
    const sections = answer.split('\n');
    const parsed = {
      answer: '',
      insight: '',
      recommendation: '',
    };

    sections.forEach((section) => {
      if (section.startsWith('답변:')) {
        parsed.answer = section.replace('답변:', '').trim();
      } else if (section.startsWith('인사이트:')) {
        parsed.insight = section.replace('인사이트:', '').trim();
      } else if (section.startsWith('추천사항:')) {
        parsed.recommendation = section.replace('추천사항:', '').trim();
      }
    });

    return parsed;
  };

  const aiAnalysisParsed = response.ai_analysis?.answer 
    ? parseAIAnalysis(response.ai_analysis.answer)
    : null;

  return (
    <Box>
      {/* 상태 표시 */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={response.status === 'success' ? '분석 완료' : '오류 발생'}
          color={response.status === 'success' ? 'success' : 'error'}
          icon={<CheckIcon />}
          sx={{ mr: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          쿼리: {response.query}
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<AIIcon />} label="AI 분석" />
          <Tab icon={<ChartIcon />} label="시각화" />
          <Tab icon={<DatabaseIcon />} label="데이터" />
          <Tab icon={<DataIcon />} label="상세 정보" />
        </Tabs>
      </Paper>

      {/* AI 분석 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* 주요 답변 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AIIcon sx={{ mr: 1 }} /> AI 분석 결과
                </Typography>
                {aiAnalysisParsed && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <AlertTitle>답변</AlertTitle>
                      {aiAnalysisParsed.answer}
                    </Alert>
                    
                    {aiAnalysisParsed.insight && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
                          <InsightIcon sx={{ mr: 1 }} /> 인사이트
                        </AlertTitle>
                        {aiAnalysisParsed.insight}
                      </Alert>
                    )}
                    
                    {aiAnalysisParsed.recommendation && (
                      <Alert severity="warning">
                        <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
                          <RecommendIcon sx={{ mr: 1 }} /> 추천사항
                        </AlertTitle>
                        {aiAnalysisParsed.recommendation}
                      </Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 리포트 정보 */}
          {response.report && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {response.report.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    생성일: {new Date(response.report.createdAt).toLocaleString('ko-KR')}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1">
                    {response.report.summary}
                  </Typography>
                  
                  {response.report.details.recommendations.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        추천 액션 아이템:
                      </Typography>
                      <List dense>
                        {response.report.details.recommendations.map((rec, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <CheckIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={rec} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* 시각화 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {response.visualizations?.map((spec, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  {spec.title && (
                    <Typography variant="h6" gutterBottom>
                      {spec.title}
                    </Typography>
                  )}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    overflow: 'auto',
                    maxHeight: 600 
                  }}>
                    <VegaEmbed 
                      spec={spec} 
                      options={{
                        actions: false,
                        config: {
                          axis: {
                            labelFont: 'Roboto',
                            titleFont: 'Roboto',
                          },
                          title: {
                            font: 'Roboto',
                            fontSize: 16,
                          },
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {(!response.visualizations || response.visualizations.length === 0) && (
            <Grid item xs={12}>
              <Alert severity="info">
                이 쿼리에 대한 시각화가 생성되지 않았습니다.
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* 데이터 탭 */}
      <TabPanel value={tabValue} index={2}>
        {response.mongodb_results?.data && response.mongodb_results.data.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                상품 데이터 ({response.mongodb_results.data.length}개)
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>브랜드</TableCell>
                      <TableCell>상품명</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell align="right">가격</TableCell>
                      <TableCell align="right">조회수</TableCell>
                      <TableCell align="right">누적판매</TableCell>
                      <TableCell align="right">평점</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {response.mongodb_results.data.map((product: ProductData) => (
                      <TableRow key={product._id} hover>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {product.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.category_l1}</TableCell>
                        <TableCell align="right">{formatPrice(product.price)}</TableCell>
                        <TableCell align="right">{formatNumber(product.views_1m)}</TableCell>
                        <TableCell align="right">{formatNumber(product.sales_cum)}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={product.rating_avg.toFixed(1)}
                            size="small"
                            color={product.rating_avg >= 4.5 ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* 상세 정보 탭 */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={2}>
          {/* MongoDB 쿼리 정보 */}
          {response.mongodb_results && (
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>MongoDB 쿼리 정보</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      컬렉션: {response.mongodb_results.collection}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      결과 수: {response.mongodb_results.data.length}개
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {response.mongodb_results.summary}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        파이프라인:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                        <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                          {JSON.stringify(response.mongodb_results.pipeline, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* 벡터 검색 결과 */}
          {response.vector_results && (
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>벡터 검색 결과</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {response.vector_results.context.map((ctx, idx) => (
                      <ListItem key={idx}>
                        <ListItemText 
                          primary={ctx}
                          secondary={`유사도 점수: ${response.vector_results!.similarity_scores[idx]}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default AIResponseViewer;