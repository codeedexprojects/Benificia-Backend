import axios from "axios";
import { env } from "../config/env";
import { InternalError } from "./errors";

const aiClient = axios.create({
  baseURL: env.AI_SERVER_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": env.AI_SERVER_API_KEY,
  },
});

export interface AiRecommendationItem {
  rank: number;
  plan_id: string;
  plan_name: string;
  score: number;
  reasoning: string;
  match_tags: string[];
  plan_snapshot: Record<string, unknown>;
}

export interface AiRecommendationResponse {
  request_id: string;
  vertical: string;
  recommendations: AiRecommendationItem[];
  llm_provider: string;
  model: string;
  latency_ms: number;
}

export async function callAiRecommendations(payload: {
  request_id: string;
  vertical: string;
  user_context: Record<string, unknown>;
  llm_provider?: string | null;
  top_n: number;
}): Promise<AiRecommendationResponse> {
  try {
    const { data } = await aiClient.post<AiRecommendationResponse>(
      "/api/v1/recommendations",
      payload,
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      // detail can be a string, an array of validation errors, or missing
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: { msg: string }) => d.msg).join(", ")
            : "AI server error";
      throw new InternalError(
        `Recommendation service error (${status ?? "network"}): ${msg}`,
      );
    }
    throw new InternalError("Unable to reach recommendation service");
  }
}
