import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import ChatMessageBubble from "../components/ChatMessageBubble";
import { sendBoardChat } from "../services/boardChat";
import { useNavigate } from "react-router-dom";

interface Message {
  sender: "user" | "bot";
  text: string;
  postLink?: string; // 🔹 게시글 링크
}

const BoardChatPage: React.FC = () => {
  const [department, setDepartment] = useState("MD");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 스크롤 자동 내려가기
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input.trim();

    // 유저 메시지 추가
    setMessages((prev) => [...prev, { sender: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendBoardChat(question, department);
      console.log("📌 BoardChat API 응답:", res);

      const answer: string =
        res.answer && res.answer.length > 0
          ? res.answer
          : "⚠️ 답변을 가져오지 못했습니다.";
      const postLink: string | undefined = res.postLink || undefined;

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: answer, postLink },
      ]);
    } catch (err: any) {
      console.error("❌ BoardChat API 에러:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ 답변을 불러오는 중 오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Typography variant="h5" gutterBottom>
        부서별 게시판 상담 챗봇
      </Typography>

      {/* 부서 선택 */}
      <Select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        sx={{ width: 200, mb: 2 }}
      >
        <MenuItem value="MD">마케팅</MenuItem>
        <MenuItem value="CS">고객지원</MenuItem>
        <MenuItem value="SW">개발</MenuItem>
      </Select>

      {/* 채팅 영역 */}
      <Box
        flexGrow={1}
        overflow="auto"
        p={2}
        border={1}
        borderColor="grey.300"
        borderRadius={2}
        mb={2}
        sx={{ bgcolor: "#fafafa" }}
      >
        {messages.map((msg, idx) => (
          <Box key={idx} mb={1}>
            <ChatMessageBubble sender={msg.sender} text={msg.text} />
            {/* 🔹 답변 메시지에 postLink가 있으면 버튼 표시 */}
            {msg.sender === "bot" && msg.postLink && (
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => {
                  if (msg.postLink) navigate(msg.postLink);
                }}
              >
                관련 게시글 보기
              </Button>
            )}
          </Box>
        ))}
        {loading && (
          <Box display="flex" justifyContent="flex-start" mb={1}>
            <CircularProgress size={20} />
            <Typography ml={1}>답변 생성 중...</Typography>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* 입력창 */}
      <Box display="flex" gap={1}>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading}>
          전송
        </Button>
      </Box>
    </Box>
  );
};

export default BoardChatPage;
