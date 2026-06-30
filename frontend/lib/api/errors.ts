import type { AxiosError } from "axios";

/** Pull a human-readable message from FastAPI / axios error responses. */
export function extractApiError(err: unknown, fallback = "Request failed."): string {
  const ax = err as AxiosError<{ detail?: unknown }>;
  const body = ax.response?.data;

  if (typeof body === "string" && body.trim()) return body;

  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((item) => {
          if (typeof item === "object" && item && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return String(item);
        })
        .filter(Boolean)
        .join("; ");
      if (msg) return msg;
    }
    const keys = Object.keys(body as object);
    if (keys.length > 0) {
      try {
        return JSON.stringify(body);
      } catch {
        /* ignore */
      }
    }
  }

  if (ax.response?.statusText) return `${ax.response.status} ${ax.response.statusText}`;
  if (ax.message) return ax.message;
  return fallback;
}
