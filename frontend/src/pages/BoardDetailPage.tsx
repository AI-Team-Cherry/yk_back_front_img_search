// src/pages/BoardDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Divider, Paper, TextField, Button, CircularProgress,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/+$/,"");

const BoardDetailPage: React.FC = () => {
  const { department, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };

  useEffect(() => {
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

  if (loading) return <CircularProgress />;
  if (!post) return <Typography>게시글을 찾을 수 없습니다.</Typography>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>{post.title}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>{post.content}</Typography>
      <Typography variant="caption" color="text.secondary">
        작성자: {post.authorName} ({post.authorId})
      </Typography>

      {user?.employeeId === post.authorId && (
        <Box mt={1} mb={2}>
          <Button size="small" color="error" variant="outlined" onClick={handleDeletePost}>
            게시글 삭제
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>답변</Typography>
      {post.replies?.length ? (
        post.replies.map((r: any, idx: number) => (
          <Paper key={idx} sx={{ p: 1.5, mb: 1 }}>
            <Typography variant="body2">{r.content}</Typography>
            <Typography variant="caption" color="text.secondary">
              {r.authorName} ({r.authorId}) | {new Date(r.created_at).toLocaleString()}
            </Typography>
            {user?.employeeId === r.authorId && (
              <Box mt={1}>
                <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteReply(idx)}>
                  삭제
                </Button>
              </Box>
            )}
          </Paper>
        ))
      ) : (
        <Typography variant="body2" color="text.secondary">아직 답변이 없습니다.</Typography>
      )}

      <Box display="flex" gap={1} mt={2}>
        <TextField
          fullWidth value={reply} onChange={(e) => setReply(e.target.value)}
          placeholder="답변 작성..." disabled={replyLoading}
        />
        <Button variant="contained" onClick={handleReply} disabled={replyLoading || !reply.trim()}>
          {replyLoading ? "등록 중..." : "등록"}
        </Button>
      </Box>
    </Box>
  );
};

export default BoardDetailPage;
