// src/pages/BoardDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Divider, Paper, TextField, Button, CircularProgress,
  Stack, Avatar, Chip, IconButton, Card, CardContent, Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Send as SendIcon,
  Campaign as CampaignIcon,
  SupportAgent as SupportIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8001").replace(/\/+$/,"");

const departments = [
  { code: "MD", name: "마케팅", icon: <CampaignIcon />, color: "#2196F3" },
  { code: "CS", name: "고객서비스", icon: <SupportIcon />, color: "#4CAF50" },
  { code: "SW", name: "소프트웨어", icon: <CodeIcon />, color: "#FF9800" },
];

const BoardDetailPage: React.FC = () => {
  const { department, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);

  const currentDeptInfo = departments.find(d => d.code === department) || departments[0];

  useEffect(() => {
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };

    const fetchPost = async () => {
      const url = `${API_BASE}/boards/${department}`;
      console.log("📥 [Detail] GET", url, "headers:", authHeaders);
      try {
        const { data } = await axios.get(url, { headers: authHeaders });
        const found = data.find((p: any) => p._id === id);
        console.log("📥 [Detail] found:", found);
        setPost(found);
      } catch (e: any) {
        console.error("❌ [Detail] 로드 실패:", e?.response?.status, e?.response?.data || e?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [department, id]);

  const handleReply = async () => {
    if (!reply.trim() || !id) return;
    setReplyLoading(true);
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };
    const url = `${API_BASE}/boards/${id}/reply`;
    console.log("➡️ [Detail] POST reply:", url, "body:", { content: reply }, "headers:", authHeaders);
    try {
      await axios.post(url, { content: reply }, { headers: authHeaders });
      setPost({
        ...post,
        replies: [
          ...(post?.replies || []),
          {
            content: reply,
            authorId: user?.employeeId,
            authorName: user?.name,
            created_at: new Date().toISOString(),
          },
        ],
      });
      setReply("");
    } catch (e: any) {
      console.error("❌ [Detail] 답글 실패:", e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post?._id) {
      console.error("🛑 [Detail] 삭제 불가: post._id 없음. post=", post);
      return;
    }
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };
    const url = `${API_BASE}/boards/${post._id}`;
    console.log("🗑️ [Detail] DELETE post:", url, "headers:", authHeaders);
    try {
      await axios.delete(url, { headers: authHeaders });
      navigate(`/boards/${department}`);
    } catch (e: any) {
      console.error("❌ [Detail] 게시글 삭제 실패:", e?.response?.status, e?.response?.data || e?.message);
    }
  };

  const handleDeleteReply = async (idx: number) => {
    if (!id) return;
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };
    const url = `${API_BASE}/boards/${id}/reply/${idx}`;
    console.log("🗑️ [Detail] DELETE reply:", url, "headers:", authHeaders);
    try {
      await axios.delete(url, { headers: authHeaders });
      setPost({
        ...post,
        replies: post.replies.filter((_: any, i: number) => i !== idx),
      });
    } catch (e: any) {
      console.error("❌ [Detail] 댓글 삭제 실패:", e?.response?.status, e?.response?.data || e?.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress size={48} sx={{ color: currentDeptInfo.color }} />
      </Box>
    );
  }

  if (!post) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          게시글을 찾을 수 없습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 뒤로가기 버튼 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton
          onClick={() => navigate(`/boards/${department}`)}
          sx={{
            bgcolor: currentDeptInfo.color + '20',
            color: currentDeptInfo.color,
            '&:hover': { bgcolor: currentDeptInfo.color + '30' }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" color="text.secondary">
          {currentDeptInfo.name} 상담 게시판
        </Typography>
      </Stack>

      {/* 메인 게시글 */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          border: `2px solid ${currentDeptInfo.color}30`,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        {/* 헤더 */}
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${currentDeptInfo.color}20 0%, ${currentDeptInfo.color}10 100%)`,
            borderBottom: `1px solid ${currentDeptInfo.color}30`
          }}
        >
          <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: currentDeptInfo.color,
                boxShadow: `0 4px 16px ${currentDeptInfo.color}40`
              }}
            >
              <PersonIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {post.title}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="subtitle1" fontWeight="600">
                  {post.authorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({post.authorId})
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(post.created_at).toLocaleString('ko-KR')}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            <Chip
              label={post.department}
              sx={{
                bgcolor: currentDeptInfo.color,
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
          </Stack>

          {user?.employeeId === post.authorId && (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleDeletePost}
                sx={{ borderRadius: 2 }}
              >
                게시글 삭제
              </Button>
            </Stack>
          )}
        </Box>

        {/* 내용 */}
        <Box sx={{ p: 4 }}>
          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.8,
              fontSize: '1.1rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {post.content}
          </Typography>
        </Box>
      </Paper>

      {/* 답변 섹션 */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <ReplyIcon sx={{ color: currentDeptInfo.color }} />
            <Typography variant="h6" fontWeight="bold">
              답변 ({post.replies?.length || 0})
            </Typography>
          </Stack>
        </Box>

        {/* 답변 목록 */}
        <Box sx={{ p: 3 }}>
          {post.replies?.length ? (
            <Stack spacing={3}>
              {post.replies.map((r: any, idx: number) => (
                <Card
                  key={idx}
                  elevation={0}
                  sx={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 2,
                    bgcolor: '#fafafa'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: currentDeptInfo.color + '20',
                          color: currentDeptInfo.color
                        }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {r.authorName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({r.authorId})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.created_at).toLocaleString('ko-KR')}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                          {r.content}
                        </Typography>
                      </Box>
                      {user?.employeeId === r.authorId && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteReply(idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Box textAlign="center" py={6}>
              <ReplyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                아직 답변이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                첫 번째 답변을 작성해보세요
              </Typography>
            </Box>
          )}
        </Box>

        {/* 답변 작성 */}
        <Box sx={{ p: 3, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight="bold">
              답변 작성
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="답변을 입력하세요..."
              disabled={replyLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'white'
                }
              }}
            />
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                startIcon={replyLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={handleReply}
                disabled={replyLoading || !reply.trim()}
                sx={{
                  bgcolor: currentDeptInfo.color,
                  '&:hover': { bgcolor: currentDeptInfo.color + 'DD' },
                  borderRadius: 2,
                  px: 3,
                  py: 1
                }}
              >
                {replyLoading ? "등록 중..." : "답변 등록"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default BoardDetailPage;
