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
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fade,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
} from "@mui/material";
import {
  Psychology,
  Send,
  History,
  TrendingUp,
  QueryStats,
  AutoAwesome,
  Refresh,
  Download,
  ContentCopy,
  Share,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { getAnalysisResults } from "../services/aiQuery";
import { VegaEmbed } from "react-vega";
import ReactMarkdown from "react-markdown";
import { exportAnalysisToPDF } from "../utils/pdfExport";
import CollectionSelector from "../components/Collections/CollectionSelector";

// ✅ Mongo 결과 테이블
const renderMongoTable = (docs: any[]) => {
  if (!docs || docs.length === 0) return null;
  const sample = docs[0];
  const keys = Object.keys(sample).filter(
    (k) => !["_id", "image_files"].includes(k)
  );

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📊 MongoDB 결과
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {keys.map((key) => (
                <TableCell key={key} sx={{ fontWeight: "bold" }}>
                  {key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.slice(0, 10).map((row, idx) => (
              <TableRow key={idx}>
                {keys.map((key) => (
                  <TableCell
                    key={key}
                    align={typeof row[key] === "number" ? "right" : "left"}
                  >
                    {key === "main_image" ? (
                      <Avatar
                        src={`${process.env.REACT_APP_IMG_URL || ""}/${
                          row[key]
                        }.jpg`}
                        alt={row.name}
                        variant="square"
                        sx={{ width: 40, height: 40 }}
                      />
                    ) : (
                      String(row[key])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ✅ 기초 통계
const renderStatistics = (statistics: any) => {
  if (!statistics || Object.keys(statistics).length === 0) return null;
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📈 기초 통계
        </Typography>
        {Object.entries(statistics).map(([col, stats]: any) => (
          <Box key={col} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">{col}</Typography>
            <Table size="small">
              <TableBody>
                {Object.entries(stats).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                    <TableCell align="right">
                      {Number(v).toFixed?.(2) ?? v}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

// ✅ 데이터 클래스
const renderDataClasses = (data_classes: any) => {
  if (!data_classes || Object.keys(data_classes).length === 0) return null;
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📂 데이터 클래스
        </Typography>
        {Object.entries(data_classes).map(([field, values]: any) => (
          <Box key={field} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{field}</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {values.slice(0, 10).map((val: string, idx: number) => (
                <Chip key={idx} label={val} variant="outlined" />
              ))}
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

// ✅ 상관관계 히트맵
const renderCorrelationHeatmap = (correlations: any) => {
  if (!correlations || Object.keys(correlations).length === 0) return null;

  const fields = Object.keys(correlations);
  const values: any[] = [];

  fields.forEach((row) => {
    fields.forEach((col) => {
      values.push({
        row,
        col,
        value: correlations[row]?.[col] ?? 0,
      });
    });
  });

  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Correlation Heatmap",
    data: { values },
    mark: "rect",
    width: 400,
    height: 400,
    encoding: {
      x: { field: "col", type: "ordinal", sort: fields },
      y: { field: "row", type: "ordinal", sort: fields },
      color: {
        field: "value",
        type: "quantitative",
        scale: { domain: [-1, 1], scheme: "redblue" },
      },
      tooltip: [
        { field: "row", type: "ordinal" },
        { field: "col", type: "ordinal" },
        { field: "value", type: "quantitative", format: ".2f" },
      ],
    },
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔗 상관관계 히트맵
        </Typography>
        <VegaEmbed spec={spec} options={{ actions: false }} />
      </CardContent>
    </Card>
  );
};

const SmartAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  const suggestedQueries = [
    "최근 한 달간 가장 인기있는 상품 카테고리는?",
    "브랜드별 매출 상위 10개 보여줘",
    "리뷰 평점이 가장 높은 상품은?",
    "지난주에 조회수가 급증한 상품은?",
    "반품률이 높은 카테고리는?",
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

    console.log("🔍 Selected collections for analysis:", selectedCollections);
    console.log("📝 Query:", query.trim());

    setIsLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 200);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:8080"
        }/llm-analysis/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            query: query.trim(),
            collections: selectedCollections,
          }),
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
    handleSubmit();
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:8080"
        }/llm-analysis/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        }
      );
      if (!response.ok) throw new Error("PDF 생성 실패");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "analysis_report.pdf");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("PDF 다운로드 오류:", err);
      setError("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const handleShareAnalysis = () => {
    if (!result) return;
    alert("공유 기능은 곧 추가됩니다!");
  };
  // MongoDB 결과 전용 렌더링 함수
  const renderMongoResults = (data: any[]) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <QueryStats />
            <Typography variant="h6" sx={{ ml: 1 }}>
              MongoDB 결과 ({data.length}건)
            </Typography>
          </Box>

          {data.slice(0, 5).map((item, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" gutterBottom>
                    📝 리뷰 내용
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, maxHeight: 100, overflow: "hidden" }}
                  >
                    {item.text?.substring(0, 200)}
                    {item.text?.length > 200 && "..."}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="textSecondary">
                    👤 작성자: {item.user_id || "N/A"}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    ⭐ 평점: {item.score || "N/A"}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    📅 작성일: {item.review_created_at || "N/A"}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    😊 감정: {item.overall_sentiment || "N/A"}(
                    {item.overall_confidence
                      ? (item.overall_confidence * 100).toFixed(1) + "%"
                      : "N/A"}
                    )
                  </Typography>
                </Grid>
              </Grid>
            </Card>
          ))}

          {data.length > 5 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              📌 상위 5건만 표시됨 (전체 {data.length}건)
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  // Vector 검색 결과 전용 렌더링 함수
  const renderVectorResults = (vectorResults: any) => {
    if (!vectorResults) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Psychology />
            <Typography variant="h6" sx={{ ml: 1 }}>
              Vector 검색 결과
            </Typography>
          </Box>

          {vectorResults.context && vectorResults.context.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🔍 관련 문맥
              </Typography>
              {vectorResults.context.map((ctx: string, index: number) => (
                <Chip
                  key={index}
                  label={`${ctx} (유사도: ${
                    vectorResults.similarity_scores?.[index] || "N/A"
                  })`}
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}

          <Typography variant="body2" color="textSecondary">
            💡 벡터 검색을 통해 질의와 유사한 문맥을 찾았습니다.
          </Typography>
        </CardContent>
      </Card>
    );
  };
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("ko-KR");

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ display: "flex", alignItems: "center" }}
        >
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
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <QueryStats sx={{ mr: 1 }} />
                AI에게 질문하기
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
                  선택된 컬렉션:{" "}
                  {selectedCollections.map((collection, index) => (
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
                placeholder="예: 최근 한 달간 가장 인기있는 상품 카테고리는?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isLoading}
              />
              {isLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    AI가 데이터를 분석하고 있습니다... {Math.round(progress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <Send />
                  }
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
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
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
            <Fade in>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    분석 결과
                  </Typography>

                  {/* ✅ 디버깅 JSON */}
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: "#1e1e1e",
                      borderRadius: 2,
                      color: "#dcdcdc",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ color: "#00e5ff" }}>
                        [DEBUG] Raw Result JSON
                      </Typography>

                      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<ContentCopy />}
                          onClick={copyToClipboard}
                          sx={{ minWidth: 100 }}
                        >
                          복사
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<Share />}
                          onClick={handleShareAnalysis}
                          sx={{ minWidth: 100 }}
                        >
                          공유
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          startIcon={<Download />}
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(result, null, 2)],
                              {
                                type: "application/json",
                              }
                            );
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.setAttribute(
                              "download",
                              "analysis_result.json"
                            );
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          sx={{ minWidth: 120 }}
                        >
                          JSON
                        </Button>
                        <Button
                          variant="outlined"
                          color="success"
                          startIcon={<Download />}
                          onClick={handleDownloadPDF}
                          sx={{ minWidth: 120 }}
                        >
                          PDF
                        </Button>
                      </Box>
                    </Box>

                    <pre
                      style={{
                        maxHeight: 200,
                        overflow: "auto",
                        fontSize: "12px",
                        margin: 0,
                        fontFamily: "monospace",
                        color: "#dcdcdc",
                        background: "transparent",
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </Box>

                  {/* 📌 요약 답변 */}
                  {result.answer && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <strong>📌 요약 답변:</strong> {result.answer}
                    </Alert>
                  )}

                  {/* 🔍 인사이트 */}
                  {result.insights && (
                    <Alert
                      severity="info"
                      sx={{ mb: 2, whiteSpace: "pre-line" }}
                    >
                      <strong>🔍 인사이트:</strong>
                      <br />
                      {result.insights}
                    </Alert>
                  )}

                  {/* 💡 추천 */}
                  {result.recommendations && (
                    <Alert
                      severity="warning"
                      sx={{ mb: 2, whiteSpace: "pre-line" }}
                    >
                      <strong>💡 추천:</strong>
                      <br />
                      {Array.isArray(result.recommendations)
                        ? result.recommendations.join("\n")
                        : result.recommendations}
                    </Alert>
                  )}

                  {/* 📜 실행된 MongoDB 쿼리 */}
                  {result?.mongodb_results?.pipeline && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          📜 실행된 MongoDB Pipeline
                        </Typography>
                        <pre
                          style={{
                            maxHeight: 200,
                            overflow: "auto",
                            fontSize: "12px",
                            background: "#f7f7f7",
                            padding: "8px",
                          }}
                        >
                          {JSON.stringify(
                            result.mongodb_results.pipeline,
                            null,
                            2
                          )}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {/* 📂 데이터 클래스 */}
                  {renderDataClasses(result.data_classes)}

                  {/* 📈 기초 통계 */}
                  {renderStatistics(result.statistics)}

                  {/* 🔗 상관관계 히트맵 */}
                  {renderCorrelationHeatmap(result.correlations)}

                  {/* 🌀 비선형 패턴 */}
                  {result.nonlinear_patterns && (
                    <Alert
                      severity="info"
                      sx={{ mb: 2, whiteSpace: "pre-line" }}
                    >
                      <strong>🌀 비선형 패턴:</strong>
                      <br />
                      {result.nonlinear_patterns}
                    </Alert>
                  )}

                  {/* 📊 MongoDB 결과 */}
                  {renderMongoTable(result.mongodb_results?.data)}

                  {/* 📂 Vector 검색 결과 */}
                  {result.vector_results && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>📂 Vector 검색 결과:</strong>
                      <pre style={{ fontSize: "12px" }}>
                        {JSON.stringify(result.vector_results, null, 2)}
                      </pre>
                    </Alert>
                  )}

                  {/* 📈 시각화 */}
                  {result.visualizations?.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        📈 시각화 결과
                      </Typography>
                      {result.visualizations.map((viz: any, idx: number) => (
                        <Card key={idx} sx={{ mb: 2 }}>
                          <CardContent>
                            <VegaEmbed
                              spec={{ ...viz, width: 600, height: 400 }}
                              options={{ actions: false }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Grid>

        {/* 컬렉션 선택 패널 */}
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

export default SmartAnalysisPage;
