import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const BoardFormPage: React.FC = () => {
  const { department } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      await axios.post(`${API_BASE}/boards/${department}`, {
        title,
        content,
        author: "익명",
      });
      setOpenSnackbar(true);
      setTimeout(() => navigate(`/boards/${department}`), 1500);
    } catch (e) {
      console.error("게시글 등록 실패:", e);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {department} 게시판 새 글 작성
      </Typography>
      <TextField
        label="제목"
        fullWidth
        sx={{ mb: 2 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="내용"
        fullWidth
        multiline
        rows={6}
        sx={{ mb: 2 }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button variant="contained" onClick={handleSubmit}>
        등록
      </Button>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          게시글이 등록되었습니다!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BoardFormPage;
