// frontend/src/services/boardChat.ts
import axios, { AxiosError } from "axios";

const BASE_URL =
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

export type Department = "MD" | "CS" | "SW" | string;

export interface BoardChatResult {
  answer: string;
  retrieved?: Array<{ id?: string; title?: string; score?: number }>;
}

export async function sendBoardChat(
  question: string,
  department?: Department
): Promise<BoardChatResult> {
  try {
    const res = await axios.post<BoardChatResult>(
      `${BASE_URL}/llm/board-chat`,
      { question, department },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 1500000,
      }
    );
    return res.data;
  } catch (err) {
    const e = err as AxiosError<any>;
    throw new Error(e.response?.data?.detail || e.message || "Failed to call /llm/board-chat");
  }
}
