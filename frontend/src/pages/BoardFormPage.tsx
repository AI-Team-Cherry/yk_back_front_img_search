// src/pages/BoardFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  Paper,
  Stack,
  Avatar,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Campaign as CampaignIcon,
  SupportAgent as SupportIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";


const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8080").replace(/\/+$/,"");


const departments = [
  { code: "MD", name: "마케팅", icon: <CampaignIcon />, color: "#2196F3" },
  { code: "CS", name: "고객서비스", icon: <SupportIcon />, color: "#4CAF50" },
  { code: "SW", name: "소프트웨어", icon: <CodeIcon />, color: "#FF9800" },
];

const BoardFormPage: React.FC = () => {
  const { department } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentDeptInfo =
    departments.find((d) => d.code === department) || departments[0];

  useEffect(() => {
    console.log("🧭 [BoardForm] department param:", department);
    console.log("🔑 [BoardForm] token:", localStorage.getItem("token"));
    console.log("👤 [BoardForm] user:", user);

    // ChatbotPopup에서 전달된 prefill 내용 처리
    const state = location.state as {
      prefillTitle?: string;
      prefillContent?: string;
    } | null;
    if (state?.prefillTitle) {
      setTitle(state.prefillTitle);
    }
    if (state?.prefillContent) {
      setContent(state.prefillContent);
    }
  }, [department, user, location.state]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    const authHeaders = {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };
    const url = `${API_BASE}/boards/${department}`;
    const body = { title, content };

    console.log(
      "➡️ [BoardForm] POST",
      url,
      "headers:",
      authHeaders,
      "body:",
      body
    );

    try {
      const res = await axios.post(url, body, { headers: authHeaders });
      console.log("✅ [BoardForm] response:", res.status, res.data);
      setOpenSnackbar(true);
      setTimeout(() => navigate(`/boards/${department}`), 1500);
    } catch (e: any) {
      console.error(
        "❌ [BoardForm] 등록 실패:",
        e?.response?.status,
        e?.response?.data || e?.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: "auto" }}>
      {/* 뒤로가기 버튼 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <IconButton
          onClick={() => navigate(`/boards/${department}`)}
          sx={{
            bgcolor: currentDeptInfo.color + "20",
            color: currentDeptInfo.color,
            "&:hover": { bgcolor: currentDeptInfo.color + "30" },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" color="text.secondary">
          {currentDeptInfo.name} 상담 게시판
        </Typography>
      </Stack>

      {/* 메인 폼 */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${currentDeptInfo.color}30`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <Box
          sx={{
            p: 2.5,
            background: `linear-gradient(135deg, ${currentDeptInfo.color}20 0%, ${currentDeptInfo.color}10 100%)`,
            borderBottom: `1px solid ${currentDeptInfo.color}30`,
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
              <EditIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                새 상담 요청 작성
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentDeptInfo.name} 부서의 전문가들에게 질문하고 답변을
                받아보세요
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* 폼 내용 */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                상담 제목 *
              </Typography>
              <TextField
                fullWidth
                placeholder="상담 내용을 간단히 요약해서 적어주세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "&:hover": {
                      "& > fieldset": {
                        borderColor: currentDeptInfo.color,
                      },
                    },
                    "&.Mui-focused": {
                      "& > fieldset": {
                        borderColor: currentDeptInfo.color,
                      },
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                상담 내용 *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="구체적인 상황과 질문 내용을 자세히 작성해주세요.&#10;더 자세한 정보를 제공할수록 정확한 답변을 받을 수 있습니다."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "&:hover": {
                      "& > fieldset": {
                        borderColor: currentDeptInfo.color,
                      },
                    },
                    "&.Mui-focused": {
                      "& > fieldset": {
                        borderColor: currentDeptInfo.color,
                      },
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ borderTop: "1px solid #e0e0e0", pt: 2.5 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={() => navigate(`/boards/${department}`)}
                  sx={{
                    borderColor: currentDeptInfo.color,
                    color: currentDeptInfo.color,
                    borderRadius: 2,
                    px: 2.5,
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={
                    submitting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim() || !content.trim()}
                  sx={{
                    bgcolor: currentDeptInfo.color,
                    "&:hover": { bgcolor: currentDeptInfo.color + "DD" },
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                  }}
                >
                  {submitting ? "등록 중..." : "상담 요청 등록"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          상담 요청이 성공적으로 등록되었습니다!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BoardFormPage;
