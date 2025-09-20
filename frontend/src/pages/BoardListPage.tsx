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
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const departments = ["MD", "CS", "SW"];

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
    <Box>
      <Typography variant="h5" gutterBottom>
        부서별 게시판
      </Typography>

      {/* 부서 선택 탭 */}
      <Tabs
        value={currentDept}
        onChange={(e, val) => navigate(`/boards/${val}`)}
        sx={{ mb: 2 }}
      >
        {departments.map((dept) => (
          <Tab key={dept} value={dept} label={dept} />
        ))}
      </Tabs>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate(`/boards/${currentDept}/new`)}
      >
        새 글 작성
      </Button>

      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {posts.map((post) => (
            <Grid item xs={12} sm={6} md={4} key={post._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardActionArea
                  sx={{ flexGrow: 1 }}
                  onClick={() =>
                    navigate(`/boards/${currentDept}/${post._id}`)
                  }
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap>
                      {post.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                      noWrap
                    >
                      {post.content}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="caption" color="text.secondary">
                        {post.author} |{" "}
                        {new Date(post.created_at).toLocaleString()}
                      </Typography>
                      <Chip
                        label={post.department}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
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
