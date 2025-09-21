// src/pages/BoardFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, TextField, Button, Typography, Snackbar, Alert,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/+$/,"");

const BoardFormPage: React.FC = () => {
  const { department } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    console.log("🧭 [BoardForm] department param:", department);
    console.log("🔑 [BoardForm] token:", localStorage.getItem("token"));
    console.log("👤 [BoardForm] user:", user);
  }, [department, user]);

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    const url = `${API_BASE}/boards/${department}`;
    const body = { title, content };

    console.log("➡️ [BoardForm] POST", url, "headers:", authHeaders, "body:", body);

    try {
      const res = await axios.post(url, body, { headers: authHeaders });
      console.log("✅ [BoardForm] response:", res.status, res.data);
      setOpenSnackbar(true);
      setTimeout(() => navigate(`/boards/${department}`), 1500);
    } catch (e: any) {
      console.error("❌ [BoardForm] 등록 실패:", e?.response?.status, e?.response?.data || e?.message);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {department} 게시판 새 글 작성
      </Typography>
      <TextField
        label="제목"
        fullWidth sx={{ mb: 2 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="내용"
        fullWidth multiline rows={6} sx={{ mb: 2 }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button variant="contained" onClick={handleSubmit}>
        등록
      </Button>

      <Snackbar open={openSnackbar} autoHideDuration={2000} onClose={() => setOpenSnackbar(false)}>
        <Alert severity="success" sx={{ width: "100%" }}>
          게시글이 등록되었습니다!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BoardFormPage;
