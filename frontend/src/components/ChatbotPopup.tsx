import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Fade,
  Grow,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Campaign as CampaignIcon,
  SupportAgent as SupportIcon,
  Code as CodeIcon,
  AutoAwesome as AIIcon,
  Science as ColabIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { sendBoardChat } from "../services/boardChat";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  sender: "user" | "bot";
  text: string;
  postLink?: string;
  timestamp?: Date;
  isTyping?: boolean;
  colabConnection?: boolean;
}

interface ChatbotPopupProps {
  open: boolean;
  onClose: () => void;
}

const departments = [
  { code: "MD", name: "마케팅", icon: <CampaignIcon />, color: "#2196F3" },
  { code: "CS", name: "고객서비스", icon: <SupportIcon />, color: "#4CAF50" },
  { code: "SW", name: "소프트웨어", icon: <CodeIcon />, color: "#FF9800" },
];

const ChatbotPopup: React.FC<ChatbotPopupProps> = ({ open, onClose }) => {
  const [department, setDepartment] = useState("MD");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "안녕하세요! 🤖 AI 상담 챗봇입니다. 마케팅 관련 질문을 자유롭게 해주세요. AI가 실시간으로 답변해드립니다.",
      timestamp: new Date(),
      colabConnection: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isConnectedToColab, setIsConnectedToColab] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const currentDept = departments.find(d => d.code === department) || departments[0];

  // 스크롤 자동 내려가기
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 부서 변경 시 환영 메시지 업데이트
  useEffect(() => {
    const welcomeMessage = {
      sender: "bot" as const,
      text: `안녕하세요! 🤖 ${currentDept.name} AI 상담 챗봇입니다. ${currentDept.name} 관련 질문을 자유롭게 해주세요. AI가 실시간으로 답변해드립니다.`,
      timestamp: new Date(),
      colabConnection: true
    };
    setMessages([welcomeMessage]);
  }, [department]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input.trim();

    // 유저 메시지 추가
    const userMessage: Message = {
      sender: "user",
      text: question,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // 타이핑 효과
    const typingMessage: Message = {
      sender: "bot",
      text: "typing...",
      isTyping: true,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const res = await sendBoardChat(question, department);
      console.log("📌 BoardChat API 응답:", res);

      // 타이핑 메시지 제거
      setMessages((prev) => prev.filter(msg => !msg.isTyping));

      const answer: string =
        res.answer && res.answer.length > 0
          ? res.answer
          : "관련 답변을 찾지 못했습니다. 새로운 질문을 게시판에 올려보시겠어요?";
      const postLink: string | undefined = res.postLink || undefined;

      const botMessage: Message = {
        sender: "bot",
        text: answer,
        postLink,
        timestamp: new Date(),
        colabConnection: isConnectedToColab
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error("❌ BoardChat API 에러:", err);
      setMessages((prev) => prev.filter(msg => !msg.isTyping));

      const errorMessage: Message = {
        sender: "bot",
        text: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
        colabConnection: false
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 커스텀 메시지 컴포넌트
  const CustomMessage = ({ message, index }: { message: Message; index: number }) => {
    const isUser = message.sender === "user";
    const isTyping = message.isTyping;

    return (
      <Grow in={true} timeout={300 + index * 100}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 1,
            px: 1
          }}
        >
          {!isUser && (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: isTyping ? '#f0f0f0' : currentDept.color,
                mr: 1,
                animation: isTyping ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              {isTyping ? <CircularProgress size={16} /> : <BotIcon />}
            </Avatar>
          )}

          <Paper
            elevation={0}
            sx={{
              maxWidth: '75%',
              p: 1.5,
              bgcolor: isUser ? currentDept.color : 'rgba(255, 255, 255, 0.05)',
              color: isUser ? 'white' : '#ffffff',
              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'none'
            }}
          >
            {isTyping ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  AI가 답변을 생성중입니다
                </Typography>
                <Box display="flex" gap={0.5}>
                  <Box sx={{ width: 4, height: 4, bgcolor: 'rgba(255, 255, 255, 0.4)', borderRadius: '50%', animation: 'bounce 1.4s infinite 0s' }} />
                  <Box sx={{ width: 4, height: 4, bgcolor: 'rgba(255, 255, 255, 0.4)', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.2s' }} />
                  <Box sx={{ width: 4, height: 4, bgcolor: 'rgba(255, 255, 255, 0.4)', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.4s' }} />
                </Box>
              </Box>
            ) : (
              <>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {message.text}
                </Typography>

                {/* AI 상태 표시 */}
                {!isUser && message.colabConnection && (
                  <Chip
                    icon={<ColabIcon />}
                    label="AI 응답"
                    size="small"
                    sx={{
                      mt: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.7rem',
                      border: 'none',
                      height: 20
                    }}
                  />
                )}

                {/* 시간 표시 */}
                {message.timestamp && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.7rem'
                    }}
                  >
                    {message.timestamp.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                )}
              </>
            )}
          </Paper>

          {isUser && (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                ml: 1
              }}
            >
              <PersonIcon />
            </Avatar>
          )}
        </Box>
      </Grow>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          bgcolor: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}
    >
      {/* 헤더 */}
      <DialogTitle sx={{ p: 2, bgcolor: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: currentDept.color,
              boxShadow: `0 2px 8px ${currentDept.color}40`
            }}
          >
            {currentDept.icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 0.5 }}>
              {currentDept.name} AI 상담 챗봇
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                icon={<ColabIcon />}
                label={isConnectedToColab ? "AI 활성화" : "연결 끊김"}
                size="small"
                color={isConnectedToColab ? "success" : "error"}
                variant="outlined"
                sx={{ color: 'rgba(255, 255, 255, 0.8)', borderColor: isConnectedToColab ? '#4caf50' : '#f44336' }}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                실시간 AI 답변 지원
              </Typography>
            </Stack>
          </Box>

          {/* 부서 선택 */}
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            size="small"
            sx={{
              minWidth: 120,
              color: 'white',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: currentDept.color },
              },
              '& .MuiSvgIcon-root': { color: 'white' }
            }}
          >
            {departments.map((dept) => (
              <MenuItem key={dept.code} value={dept.code}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {dept.icon}
                  <span>{dept.name}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>

          <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* 채팅 영역 */}
      <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 1,
            py: 2,
            background: 'transparent'
          }}
        >
          {messages.map((message, index) => (
            <CustomMessage key={index} message={message} index={index} />
          ))}

          <div ref={chatEndRef} />
        </Box>

        {/* 입력창 */}
        <Box sx={{ pt: 1 }}>
          <Paper
            elevation={3}
            sx={{
              p: 1,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                fullWidth
                multiline
                maxRows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`${currentDept.name} 관련 질문을 입력하세요...`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.15)'
                    },
                    '&:hover': {
                      '& > fieldset': {
                        borderColor: currentDept.color
                      }
                    },
                    '&.Mui-focused': {
                      '& > fieldset': {
                        borderColor: currentDept.color
                      }
                    }
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)'
                  }
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={loading || !input.trim()}
                sx={{
                  bgcolor: currentDept.color,
                  color: 'white',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    bgcolor: currentDept.color + 'DD'
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                {loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Stack>
          </Paper>
        </Box>
      </DialogContent>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Dialog>
  );
};

export default ChatbotPopup;