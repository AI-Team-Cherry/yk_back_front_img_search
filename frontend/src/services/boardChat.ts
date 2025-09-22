import axios, { AxiosError } from "axios";

const BASE_URL =
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");


export type Department = "MD" | "CS" | "SW" | string;

export interface BoardChatResult {
  status: string; // ✅ 백엔드 응답 status
  answer: string; // ✅ Colab/백엔드에서 정제된 답변
  query?: string; // 사용자가 보낸 질문
  department?: string; // 선택한 부서
  postLink?: string; // ✅ 관련 게시글 링크
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
    throw new Error(
      e.response?.data?.detail || e.message || "Failed to call /llm/board-chat"
    );
  }
}
