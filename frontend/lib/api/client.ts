import axios from "axios";
import { extractApiError } from "./errors";

function resolveApiBaseUrl(): string {
  const directBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // Browser requests use the Next.js rewrite proxy to avoid CORS during dev/e2e.
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    return "/api/backend";
  }
  return `${directBase}/api/v1`;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "API error:",
      error.response?.status,
      extractApiError(error, "(no detail)")
    );
    return Promise.reject(error);
  }
);
