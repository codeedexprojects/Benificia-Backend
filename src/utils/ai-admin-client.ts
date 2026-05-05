import axios, { type AxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { InternalError } from "./errors";

const aiAdminClient = axios.create({
  baseURL: env.AI_SERVER_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": env.AI_SERVER_API_KEY,
  },
});

// Admin routes require X-Admin-Key instead of (or in addition to) x-api-key
aiAdminClient.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (url.startsWith("/admin/")) {
    config.headers["X-Admin-Key"] = env.AI_SERVER_ADMIN_KEY;
  }
  return config;
});

export async function aiAdminGet<T = unknown>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  try {
    const config: AxiosRequestConfig = params ? { params } : {};
    const { data } = await aiAdminClient.get<T>(path, config);
    return data;
  } catch (err) {
    throw mapError(err);
  }
}

export async function aiAdminPost<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  try {
    const { data } = await aiAdminClient.post<T>(path, body);
    return data;
  } catch (err) {
    throw mapError(err);
  }
}

export async function aiAdminPatch<T = unknown>(
  path: string,
  body?: unknown,
): Promise<T> {
  try {
    const { data } = await aiAdminClient.patch<T>(path, body);
    return data;
  } catch (err) {
    throw mapError(err);
  }
}

export async function aiAdminDelete<T = unknown>(path: string): Promise<T> {
  try {
    const { data } = await aiAdminClient.delete<T>(path);
    return data;
  } catch (err) {
    throw mapError(err);
  }
}

function mapError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? "network";
    const detail = err.response?.data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg: string }) => d.msg).join(", ")
          : err.message || "AI server error";
    return new InternalError(`AI server error (${status}): ${msg}`);
  }
  return new InternalError("Unable to reach AI server");
}
