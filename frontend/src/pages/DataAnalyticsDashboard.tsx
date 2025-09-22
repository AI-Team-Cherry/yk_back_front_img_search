import React, { useState } from "react";
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
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Analytics,
  Send,
  Code,
  TableChart,
  BarChart,
  ShowChart,
  DonutSmall,
  ExpandMore,
  Download,
  Refresh,
  Settings,
  FilterList,
  Visibility,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import CollectionSelector from "../components/Collections/CollectionSelector";
import { apiConfig } from "../utils/apiConfig";
import {
  BarChart,
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
  ResponsiveContainer
} from 'recharts';

// 차트 타입 정의
type ChartType = 'bar' | 'line' | 'donut';

interface ChartOptions {
  title: string;
  xField: string;
  yField: string;
  colorField?: string;
  showLegend: boolean;
  showGrid: boolean;
  animated: boolean;
}

interface AnalysisResult {
  query: string;
  mongodb_query: string;
  columns: string[];
  sample_data: any[];
  csv_data: string;
  total_count: number;
  chart_suggestion: {
    type: ChartType;
    x_field: string;
    y_field: string;
    title: string;
  };
}

const DataAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // 차트 설정
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  const [chartOptions, setChartOptions] = useState<ChartOptions>({
    title: '',
    xField: '',
    yField: '',
    colorField: '',
    showLegend: true,
    showGrid: true,
    animated: true,
  });

  // 탭 상태
  const [activeTab, setActiveTab] = useState(0);

  const suggestedQueries = [
    "좋아요가 가장 많은 상품 상위 10개를 보여주세요",
    "브랜드별 상품 수와 평균 가격을 조회해주세요",
    "카테고리별 상품 분포를 확인해주세요",
    "평점이 높은 상품들의 공통 특성을 분석해주세요",
    "가격대별 상품 분포와 판매량을 비교해주세요",
    "리뷰가 많은 상품 상위 15개의 평점 분포를 보여주세요",
    "성별별 인기 카테고리 분포를 조회해주세요",
    "조회수가 높은 상품들의 가격 범위를 분석해주세요"
  ];

  const handleSubmit = async () => {
    if (!query.trim() || !user?.id) return;

    if (selectedCollections.length === 0) {
      setError("분석할 컬렉션을 먼저 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 200);

    try {
      // 동적으로 백엔드 URL 가져오기
      const backendUrl = await apiConfig.detectAvailableServer();

      const response = await fetch(
        `${backendUrl}/llm-analysis/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            query: query.trim(),
            collections: selectedCollections
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 [Colab Response]", data);

      // 코랩 응답을 프론트엔드 형식으로 변환
      const mongoResults = data.mongodb_results || {};

      // 차트에 적합한 필드 자동 감지
      const detectChartFields = (dataArray: any[]) => {
        if (!dataArray || dataArray.length === 0) return { x_field: '', y_field: '' };

        const sample = dataArray[0];
        const numericFields = [];
        const textFields = [];

        for (const [key, value] of Object.entries(sample)) {
          if (key === '_id') continue;
          if (typeof value === 'number') {
            numericFields.push(key);
          } else if (typeof value === 'string') {
            textFields.push(key);
          }
        }

        // 좋아요, 평점, 가격 등을 우선순위로 Y축 설정
        const priorityYFields = ['hearts', 'rating_avg', 'price', 'sales_cum', 'views_1m', 'reviews_count'];
        let yField = numericFields.find(field => priorityYFields.includes(field)) || numericFields[0] || 'value';

        // 이름, 브랜드 등을 우선순위로 X축 설정
        const priorityXFields = ['name', 'brand', 'category_l1', 'title'];
        let xField = textFields.find(field => priorityXFields.includes(field)) || textFields[0] || 'name';

        return { x_field: xField, y_field: yField };
      };

      const chartFields = detectChartFields(mongoResults.data);

      const analyticsData = {
        query: data.query,
        mongodb_query: `db.${mongoResults.collection}.aggregate(${JSON.stringify(mongoResults.pipeline, null, 2)})`,
        columns: mongoResults.data?.length > 0 ? Object.keys(mongoResults.data[0]) : [],
        sample_data: mongoResults.data || [],
        csv_data: convertToCsv(mongoResults.data || []),
        total_count: mongoResults.data?.length || 0,
        chart_suggestion: {
          type: 'bar' as ChartType,
          x_field: chartFields.x_field,
          y_field: chartFields.y_field,
          title: `${data.query} 분석 결과`
        }
      };

      setResult(analyticsData);
      setProgress(100);

      // 차트 옵션 자동 설정
      if (analyticsData.chart_suggestion) {
        setSelectedChartType(analyticsData.chart_suggestion.type);
        setChartOptions(prev => ({
          ...prev,
          title: analyticsData.chart_suggestion.title,
          xField: analyticsData.chart_suggestion.x_field,
          yField: analyticsData.chart_suggestion.y_field,
        }));
      }

      setQuery("");
    } catch (error: any) {
      console.error("❌ 분석 요청 오류:", error);
      setError(error.message || "데이터 분석 중 오류가 발생했습니다.");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const convertToCsv = (data: any[]) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  };

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery);
  };

  const downloadCSV = () => {
    if (!result?.csv_data) return;

    const blob = new Blob([result.csv_data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analysis_result_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 차트 데이터 전처리
  const prepareChartData = () => {
    if (!result?.sample_data || result.sample_data.length === 0) return [];

    return result.sample_data.map((item, index) => ({
      ...item,
      index: index + 1,
      name: item[chartOptions.xField] || item.name || `Item ${index + 1}`,
      value: item[chartOptions.yField] || item.value || 0
    }));
  };

  // 도넛 차트용 색상 팔레트
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  // 차트 렌더링
  const renderChart = () => {
    const chartData = prepareChartData();

    if (chartData.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <Typography variant="h6" color="textSecondary">
            차트를 표시할 데이터가 없습니다
          </Typography>
        </Box>
      );
    }

    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {chartOptions.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              {chartOptions.showLegend && <Legend />}
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {chartOptions.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              {chartOptions.showLegend && <Legend />}
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              {chartOptions.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Typography variant="h6" color="textSecondary">
              지원되지 않는 차트 타입입니다
            </Typography>
          </Box>
        );
    }
  };

  const renderChartTypeSelector = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
          <BarChart sx={{ mr: 1 }} />
          차트 설정
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>차트 타입</InputLabel>
              <Select
                value={selectedChartType}
                onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
                label="차트 타입"
              >
                <MenuItem value="bar">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChart sx={{ mr: 1 }} /> 막대 차트
                  </Box>
                </MenuItem>
                <MenuItem value="line">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShowChart sx={{ mr: 1 }} /> 선 차트
                  </Box>
                </MenuItem>
                <MenuItem value="donut">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DonutSmall sx={{ mr: 1 }} /> 도넛 차트
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={8}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  고급 옵션
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="차트 제목"
                      value={chartOptions.title}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, title: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="X축 필드"
                      value={chartOptions.xField}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, xField: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Y축 필드"
                      value={chartOptions.yField}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, yField: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="색상 필드 (선택사항)"
                      value={chartOptions.colorField}
                      onChange={(e) => setChartOptions(prev => ({ ...prev, colorField: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={chartOptions.showLegend} onChange={(e) => setChartOptions(prev => ({ ...prev, showLegend: e.target.checked }))} />}
                        label="범례 표시"
                      />
                      <FormControlLabel
                        control={<Switch checked={chartOptions.showGrid} onChange={(e) => setChartOptions(prev => ({ ...prev, showGrid: e.target.checked }))} />}
                        label="격자 표시"
                      />
                      <FormControlLabel
                        control={<Switch checked={chartOptions.animated} onChange={(e) => setChartOptions(prev => ({ ...prev, animated: e.target.checked }))} />}
                        label="애니메이션"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderResultTabs = () => {
    if (!result) return null;

    const tabLabels = ['MongoDB 쿼리', '데이터 컬럼', '샘플 데이터', '차트'];

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">분석 결과</Typography>
            <Box>
              <Tooltip title="CSV 다운로드">
                <IconButton onClick={downloadCSV} color="primary">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="새로고침">
                <IconButton onClick={() => setResult(null)}>
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
                  {result.mongodb_query}
                </pre>
              </Paper>
            </Box>
          )}

          {/* 데이터 컬럼 탭 */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TableChart sx={{ mr: 1 }} />
                데이터 컬럼 ({result.columns.length}개)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {result.columns.map((column, index) => (
                  <Chip
                    key={index}
                    label={column}
                    variant="outlined"
                    icon={<FilterList />}
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
                샘플 데이터 (상위 10개 / 전체 {result.total_count}개)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {result.columns.map((column) => (
                        <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.sample_data.map((row, index) => (
                      <TableRow key={index}>
                        {result.columns.map((column) => (
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

          {/* 차트 탭 */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                데이터 시각화
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedChartType === 'bar' && '막대 차트로 카테고리별 데이터를 비교해보세요'}
                {selectedChartType === 'line' && '선 차트로 시간 흐름에 따른 변화를 확인해보세요'}
                {selectedChartType === 'donut' && '도넛 차트로 전체 중 각 부분의 비율을 확인해보세요'}
              </Alert>
              <Paper sx={{ p: 3, minHeight: 450 }}>
                <Typography variant="h6" gutterBottom>
                  {chartOptions.title || `${selectedChartType} 차트`}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  X축: {chartOptions.xField || '미설정'} | Y축: {chartOptions.yField || '미설정'}
                </Typography>
                {renderChart()}
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
          <Analytics sx={{ mr: 2, color: "primary.main" }} />
          데이터 분석 대시보드
        </Typography>
        <Typography variant="body1" color="textSecondary">
          자연어 질문으로 데이터를 탐색하고 기초 통계를 확인하세요
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 메인 콘텐츠 */}
        <Grid item xs={12} md={8}>
          {/* 질의 입력 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                <Analytics sx={{ mr: 1 }} />
                데이터 탐색 질의
                {selectedCollections.length > 0 && (
                  <Chip
                    label={`📊 ${selectedCollections.length}개 컬렉션`}
                    size="small"
                    color="primary"
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>

              {selectedCollections.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  분석 대상: {selectedCollections.map((collection, index) => (
                    <Chip
                      key={collection}
                      label={collection}
                      size="small"
                      sx={{ mr: 0.5, ml: index === 0 ? 0.5 : 0 }}
                    />
                  ))}
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="예: 좋아요가 가장 많은 상품 상위 10개를 보여주세요"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isLoading}
              />

              {isLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    데이터를 분석하고 있습니다... {Math.round(progress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  sx={{ px: 4 }}
                >
                  {isLoading ? "분석 중..." : "분석 시작"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setQuery("")}
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
              <Typography variant="h6" gutterBottom>
                추천 탐색 질의
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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

          {/* 차트 설정 */}
          {result && renderChartTypeSelector()}

          {/* 결과 */}
          {result && renderResultTabs()}

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </Grid>

        {/* 사이드바 - 컬렉션 선택 */}
        <Grid item xs={12} md={4}>
          <CollectionSelector
            selectedCollections={selectedCollections}
            onCollectionSelect={setSelectedCollections}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataAnalyticsDashboard;