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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Analytics,
  Send,
  Code,
  TableChart,
  ShowChart,
  DonutSmall,
  Download,
  Refresh,
  Visibility,
  Settings,
  Share,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import CollectionSelector from "../components/Collections/CollectionSelector";
import { apiConfig } from "../utils/apiConfig";
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

interface AnalysisResult {
  query: string;
  mongodb_query: string;
  columns: string[];
  sample_data: any[];
  csv_data: string;
  total_count: number;
  visualizations?: any[];
  ai_analysis?: {
    statistics?: any;
    correlations?: any;
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
  const [activeTab, setActiveTab] = useState(0);
  const [chartOptions, setChartOptions] = useState({
    type: 'bar',
    showGrid: true,
    showLegend: true,
    dataLimit: 10,
  });
  const [isSharing, setIsSharing] = useState(false);

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

      const mongoResults = data.mongodb_results || {};

      const analyticsData = {
        query: data.query,
        mongodb_query: `db.${mongoResults.collection}.aggregate(${JSON.stringify(mongoResults.pipeline, null, 2)})`,
        columns: mongoResults.data?.length > 0 ? Object.keys(mongoResults.data[0]) : [],
        sample_data: mongoResults.data || [],
        csv_data: convertToCsv(mongoResults.data || []),
        total_count: mongoResults.data?.length || 0,
        visualizations: data.visualizations || [],
        ai_analysis: data.ai_analysis || {},
      };

      setResult(analyticsData);
      setProgress(100);
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

  const shareAnalysis = async () => {
    if (!result || !user?.id) return;

    setIsSharing(true);
    try {
      const backendUrl = await apiConfig.detectAvailableServer();

      const shareData = {
        title: result.query,
        query: result.query,
        mongodb_query: result.mongodb_query,
        columns: result.columns,
        sample_data: result.sample_data,
        csv_data: result.csv_data,
        total_count: result.total_count,
        chart_options: chartOptions,
        created_by: user.id,
        created_at: new Date().toISOString(),
        collections: selectedCollections
      };

      const response = await fetch(`${backendUrl}/api/shared-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) {
        throw new Error(`공유 실패: ${response.status}`);
      }

      const sharedAnalysis = await response.json();

      // 성공 메시지
      setError(null);
      alert('분석 결과가 성공적으로 공유되었습니다!');

    } catch (error: any) {
      console.error("공유 오류:", error);
      setError(error.message || "분석 결과 공유 중 오류가 발생했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  const generateChartData = () => {
    if (!result?.sample_data || result.sample_data.length === 0) return [];

    const numericColumns = result.columns.filter(col => {
      const sampleValue = result.sample_data[0][col];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    });

    if (numericColumns.length === 0) return [];

    const limitedData = result.sample_data.slice(0, chartOptions.dataLimit);

    return limitedData.map((row, index) => {
      const chartRow: any = { name: `항목 ${index + 1}` };

      numericColumns.forEach(col => {
        const value = Number(row[col]);
        if (!isNaN(value)) {
          chartRow[col] = value;
        }
      });

      // 이름 컬럼이 있으면 사용
      const nameColumns = result.columns.filter(col =>
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

    const numericColumns = result?.columns.filter(col => {
      const sampleValue = result.sample_data[0][col];
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
            {numericColumns.slice(0, 3).map((col, index) => (
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
            {numericColumns.slice(0, 3).map((col, index) => (
              <Line key={col} type="monotone" dataKey={col} stroke={colors[index]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartOptions.type === 'pie') {
      const pieData = chartData.slice(0, 5).map((item, index) => ({
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
              {pieData.map((entry, index) => (
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
    if (!result) return null;

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
    if (!result) return null;

    const tabLabels = ['MongoDB 쿼리', '데이터 컬럼', '샘플 데이터', '차트 분석'];

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
              <Tooltip title="분석 결과 공유">
                <IconButton
                  onClick={shareAnalysis}
                  color="secondary"
                  disabled={isSharing}
                >
                  {isSharing ? <CircularProgress size={20} /> : <Share />}
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
          {result && renderChartSettings()}

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