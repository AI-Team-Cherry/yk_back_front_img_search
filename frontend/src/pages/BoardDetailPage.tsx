import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Divider,
  Paper,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const BoardDetailPage: React.FC = () => {
  const { department, id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);

  // 게시글 로드
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/boards/${department}`);
        const found = data.find((p: any) => p._id === id);
        setPost(found);
      } catch (e) {
        console.error("게시글 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [department, id]);

  // 답글 작성
  const handleReply = async () => {
    if (!reply.trim()) return;
    setReplyLoading(true);
    try {
      await axios.post(`${API_BASE}/boards/${id}/reply`, {
        content: reply,
        author: "익명",
      });
      // 새 답글을 state에 바로 반영
      setPost({
        ...post,
        replies: [
          ...(post.replies || []),
          { content: reply, author: "익명", created_at: new Date().toISOString() },
        ],
      });
      setReply("");
    } catch (e) {
      console.error("답글 등록 실패:", e);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  if (!post) return <Typography>게시글을 찾을 수 없습니다.</Typography>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {post.title}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {post.content}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        답변
      </Typography>
      {post.replies?.length ? (
        post.replies.map((r: any, idx: number) => (
          <Paper key={idx} sx={{ p: 1.5, mb: 1 }}>
            <Typography variant="body2">{r.content}</Typography>
            <Typography variant="caption" color="text.secondary">
              {r.author} | {new Date(r.created_at).toLocaleString()}
            </Typography>
          </Paper>
        ))
      ) : (
        <Typography variant="body2" color="text.secondary">
          아직 답변이 없습니다.
        </Typography>
      )}

      <Box display="flex" gap={1} mt={2}>
        <TextField
          fullWidth
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="답변 작성..."
          disabled={replyLoading}
        />
        <Button
          variant="contained"
          onClick={handleReply}
          disabled={replyLoading || !reply.trim()}
        >
          {replyLoading ? "등록 중..." : "등록"}
        </Button>
      </Box>
    </Box>
  );
};

export default BoardDetailPage;
