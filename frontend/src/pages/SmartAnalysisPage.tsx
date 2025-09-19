import React, { useState, useEffect } from "react";
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
} from "@mui/material";
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
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { getAnalysisResults, QueryResponse } from "../services/aiQuery";
import { submitQuery, saveAnalysis } from "../services/analytics";
import { AnalysisResult as MLAnalysisResult } from "../types";
import { VegaEmbed } from "react-vega";
import ReactMarkdown from "react-markdown";
import { exportAnalysisToPDF } from "../utils/pdfExport";

const SmartAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | MLAnalysisResult | null>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const suggestedQueries = [
    "신규 가입자 중에서 30일 안에 첫 구매할 확률 높은 사람들 리스트 뽑아줘",
    "이탈 위험 높은데 쿠폰 주면 돌아올 확률 큰 고객만 골라줘",
    "이번 주에 상의/하의 각 5% 가격 인하하면 예측 판매량이 얼마나 늘까?",
    "장바구니에 담고 나간 사람 중 48시간 내 결제할 가능성 높은 사용자만 알려줘",
    "브랜드 신뢰도가 높아 재구매로 이어질 확률 큰 브랜드 톱5는 어디야?",
  ];

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
      console.error("Failed to load recent queries:", error);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim() || !user?.id) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 200);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/llm-analysis/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query: query.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error(`LLM 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log("📩 [LLM 응답 원본] ===", data);

      setResult(data);
      setProgress(100);
      await loadRecentQueries();
      setQuery("");
    } catch (error: any) {
      console.error("❌ LLM 요청 오류:", error);
      setError(error.message || "AI 분석 중 오류가 발생했습니다.");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = async (suggestedQuery: string) => {
    setQuery(suggestedQuery);
    setIsLoading(true);
    setError(null);
    setResult(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      console.log("🚀 추천 질의 실행:", suggestedQuery);
      const response = await submitQuery({ query: suggestedQuery });
      console.log("📊 추천 질의 응답:", response);
      setResult(response);
      setProgress(100);

      if (user?.id) {
        const newQuery = {
          id: Date.now().toString(),
          userId: user.id,
          query: suggestedQuery,
          result: response,
          createdAt: new Date().toISOString(),
          isPublic: false,
          tags: [],
        };
        setRecentQueries((prev) => [newQuery, ...prev.slice(0, 4)]);
      }

      setQuery("");
    } catch (error: any) {
      setError(error.message || "AI 분석 중 오류가 발생했습니다.");
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      await exportAnalysisToPDF(
        {
          query: query || "분석 결과",
          result: result as MLAnalysisResult,
          title: query || "분석 결과",
          createdAt: new Date(),
        },
        "analysis-result-visualization"
      );
    } catch (error) {
      console.error("PDF 다운로드 오류:", error);
      setError("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString("ko-KR");

  const handleShareAnalysis = async () => {
    if (!result || !user?.id) return;
    setShareLoading(true);
    try {
      await saveAnalysis({
        query: query || "분석 결과",
        result: result as MLAnalysisResult,
        title: query || "분석 결과",
        description: "스마트 AI 분석 결과",
        tags: ["AI분석", "공유"],
        isPublic: true,
      });
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (error) {
      console.error("분석 공유 중 오류:", error);
      setError("분석 공유 중 오류가 발생했습니다.");
    } finally {
      setShareLoading(false);
    }
  };

  const renderResultSection = (title: string, content: any, icon: React.ReactNode) => {
    if (!content) return null;
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {title}
            </Typography>
          </Box>
          <Paper sx={{ p: 2, bgcolor: "background.default" }}>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>
              {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
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
        <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
          <Psychology sx={{ mr: 2, color: "primary.main" }} />
          스마트 AI 분석
        </Typography>
        <Typography variant="body1" color="textSecondary">
          자연어로 질문하면 AI가 데이터를 분석하고 인사이트를 제공합니다
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 질의 입력 */}
        <Grid item xs={12} md={8}>
          {/* 입력 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
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
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => setQuery("")} disabled={isLoading}>
                  초기화
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 추천 질의 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                <AutoAwesome sx={{ mr: 1 }} />
                추천 질의
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

          {/* 결과 */}
          {result && (
            <Fade in={true}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    분석 결과
                  </Typography>

                  {renderResultSection("AI 분석 (Answer)", (result as any).ai_analysis?.answer, <TrendingUp />)}
                  {renderResultSection("AI 인사이트 (Insights)", (result as any).ai_analysis?.insights, <Psychology />)}
                  {renderResultSection("AI 추천 (Recommendations)", (result as any).ai_analysis?.recommendations, <AutoAwesome />)}

                  {renderResultSection(
                    "MongoDB 결과",
                    JSON.stringify((result as any).mongodb_results?.data?.slice(0, 5), null, 2),
                    <QueryStats />
                  )}

                  {renderResultSection("Vector 검색 결과", (result as any).vector_results, <Psychology />)}

                  {/* ✅ Vega-Lite 시각화 */}
{(result as any).visualizations &&
  (result as any).visualizations.length > 0 && (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          시각화 결과
        </Typography>
        {(result as any).visualizations.map((viz: any, idx: number) => (
          <Box key={idx} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {viz.title || `Visualization ${idx + 1}`}
            </Typography>
            <VegaEmbed
              spec={{
                ...viz,
                width: 600,
                height: 400,
                encoding: {
                  ...viz.encoding,
                  // ✅ fallback: metric 없으면 hearts
                  y: {
                    field: viz.encoding?.y?.field || "hearts",
                    type: "quantitative",
                  },
                },
              }}
              options={{ actions: false }}
            />
          </Box>
        ))}
      </CardContent>
    </Card>
  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* 최근 이력 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                <History sx={{ mr: 1 }} /> 최근 분석 이력
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
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        borderRadius: 1,
                      }}
                      onClick={() => setQuery(item.query)}
                    >
                      <ListItemIcon>
                        <QueryStats color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" noWrap>{item.query}</Typography>}
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
