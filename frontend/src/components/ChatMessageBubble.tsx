import React from "react";
import { Box, Typography, Paper } from "@mui/material";

interface ChatMessageBubbleProps {
  sender: "user" | "bot";
  text: string;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ sender, text }) => {
  const isUser = sender === "user";

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={1}
    >
      <Paper
        elevation={2}
        sx={{
          p: 1.5,
          maxWidth: "70%",
          bgcolor: isUser ? "primary.main" : "grey.200",
          color: isUser ? "white" : "black",
          borderRadius: 3,
        }}
      >
        <Typography variant="body1">{text}</Typography>
      </Paper>
    </Box>
  );
};

export default ChatMessageBubble;
