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

interface Message {
  sender: "user" | "bot";
  text: string;
}

const BoardChatPage: React.FC = () => {
  const [department, setDepartment] = useState("MD");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

      // 🔹 응답 구조 확인 (디버깅)
      console.log("📌 BoardChat API 응답:", res);
      const r: any = res;

      // 🔹 answer가 없을 경우 다른 필드도 fallback
      const answer =
        r.answer || r.result || r.message || "⚠️ 응답에 answer 없음";

      setMessages((prev) => [...prev, { sender: "bot", text: answer }]);
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
          <ChatMessageBubble key={idx} sender={msg.sender} text={msg.text} />
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
