import type {
  GroupedLogsPayload,
  LogItem,
  LogKind,
  SearchLogsPayload,
} from "@/types/log";
import * as Cookies from "@/services/cookies";

function getAuthHeaders(): Record<string, string> {
  if (typeof document === "undefined") {
    return {};
  }

  const token = Cookies.get("token");
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Ignore malformed payloads and keep fallback.
  }

  return fallback;
}

export async function getLogs(date?: string): Promise<LogItem[]> {
  const res = await fetch(
    `/api/logs?days=1${date ? `&reference=${date}` : ""}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const payload = (await res.json()) as GroupedLogsPayload;
  return payload.groups[0]?.items || [];
}

export async function getLatestGroups(days: number): Promise<LogItem[][]> {
  const res = await fetch(`/api/logs?days=${days}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as GroupedLogsPayload;
  return payload.groups.map((group) => group.items);
}

export async function getLogGroups(reference: string, days: number) {
  const res = await fetch(
    `/api/logs?days=${days}&reference=${encodeURIComponent(reference)}`,
    {
      cache: "no-store",
      headers: getAuthHeaders(),
    },
  );
  if (!res.ok) return [];
  const payload = (await res.json()) as GroupedLogsPayload;
  return payload.groups.map((group) => group.items);
}

export async function createLog(kind: LogKind, content: string) {
  const res = await fetch(`/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ kind, content }),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Failed to create log"));
  }
  return res.json();
}

export async function deleteLog(date: string, id: number) {
  const res = await fetch(`/api/logs/${id}?date=${encodeURIComponent(date)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Failed to delete log"));
  }
  return res.json();
}

type SearchLogsParams = {
  query?: string;
  kinds?: LogKind[];
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function searchLogs({
  query,
  kinds,
  offset,
  limit,
  signal,
}: SearchLogsParams): Promise<SearchLogsPayload> {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query);
  }

  if (kinds?.length) {
    params.set("kinds", kinds.join(","));
  }

  if (typeof offset === "number") {
    params.set("offset", String(offset));
  }

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const suffix = params.toString();
  const res = await fetch(`/api/logs/search${suffix ? `?${suffix}` : ""}`, {
    cache: "no-store",
    signal,
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, "Failed to search logs"));
  }

  return res.json();
}

export async function login(password: string) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error || "Login failed");
  }
  return response.json();
}
