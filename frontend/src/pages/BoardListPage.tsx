import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Paper,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Forum as ForumIcon,
  Campaign as CampaignIcon,
  SupportAgent as SupportIcon,
  Code as CodeIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const departments = [
  { code: "MD", name: "마케팅", icon: <CampaignIcon />, color: "#2196F3" },
  { code: "CS", name: "고객서비스", icon: <SupportIcon />, color: "#4CAF50" },
  { code: "SW", name: "소프트웨어", icon: <CodeIcon />, color: "#FF9800" },
];

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  department: string;
}

const BoardListPage: React.FC = () => {
  const { department } = useParams();
  const navigate = useNavigate();
  const currentDept = department || "MD";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDeptInfo =
    departments.find((d) => d.code === currentDept) || departments[0];

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_BASE}/boards/${currentDept}`);
        setPosts(data);
      } catch (e) {
        console.error("게시글 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [currentDept]);

  return (
    <Box sx={{ p: 2 }}>
      {/* 헤더 섹션 */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          background: `linear-gradient(135deg, ${currentDeptInfo.color}20 0%, ${currentDeptInfo.color}10 100%)`,
          border: `1px solid ${currentDeptInfo.color}30`,
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: currentDeptInfo.color,
              boxShadow: `0 4px 16px ${currentDeptInfo.color}40`,
            }}
          >
            <ForumIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {currentDeptInfo.name} 상담 게시판
            </Typography>
            <Typography variant="body2" color="text.secondary">
              부서별 전문 상담 및 질의응답을 위한 AI 지원 플랫폼
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/boards/${currentDept}/new`)}
            sx={{
              bgcolor: currentDeptInfo.color,
              "&:hover": { bgcolor: currentDeptInfo.color + "DD" },
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            새 상담 요청
          </Button>
        </Stack>
      </Paper>

      {/* 부서 선택 탭 */}
      <Paper elevation={0} sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs
          value={currentDept}
          onChange={(e, val) => navigate(`/boards/${val}`)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              minHeight: 48,
              fontSize: "0.9rem",
              fontWeight: 600,
            },
          }}
        >
          {departments.map((dept) => (
            <Tab
              key={dept.code}
              value={dept.code}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  {dept.icon}
                  <span>{dept.name}</span>
                </Stack>
              }
              sx={{
                "&.Mui-selected": {
                  color: dept.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* 게시글 목록 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={40} sx={{ color: currentDeptInfo.color }} />
        </Box>
      ) : posts.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            border: "2px dashed #e0e0e0",
            borderRadius: 2,
          }}
        >
          <ForumIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            아직 게시된 상담 요청이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            첫 번째 상담 요청을 작성해보세요
          </Typography>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/boards/${currentDept}/new`)}
            sx={{ bgcolor: currentDeptInfo.color }}
          >
            상담 요청 작성
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {posts.map((post) => (
            <Grid item xs={12} md={6} lg={4} key={post._id}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 4px 15px ${currentDeptInfo.color}20`,
                    borderColor: currentDeptInfo.color,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/boards/${currentDept}/${post._id}`)}
                  sx={{ height: "100%", p: 0 }}
                >
                  <CardContent
                    sx={{
                      p: 2,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* 헤더 */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{ mb: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: currentDeptInfo.color + "20",
                          color: currentDeptInfo.color,
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight="bold"
                          fontSize="0.875rem"
                        >
                          {post.author}
                        </Typography>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <TimeIcon
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontSize="0.75rem"
                          >
                            {new Date(post.created_at).toLocaleDateString(
                              "ko-KR"
                            )}
                          </Typography>
                        </Stack>
                      </Box>
                      <Chip
                        label={post.department}
                        size="small"
                        sx={{
                          bgcolor: currentDeptInfo.color + "20",
                          color: currentDeptInfo.color,
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          height: 24,
                        }}
                      />
                    </Stack>

                    <Divider sx={{ mb: 1.5 }} />

                    {/* 내용 */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                        fontSize="1rem"
                      >
                        {post.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontSize="0.875rem"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.4,
                        }}
                      >
                        {post.content}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BoardListPage;
