import {
  buildDateWindow,
  isDateKey,
  shiftDateKey,
  toDateKey,
} from "@/lib/date";
import {
  LOG_KINDS,
  type GroupedLogsPayload,
  type LogFilters,
  type LogItem,
  type LogKind,
} from "@/types/log";
import * as FileLogs from "@/lib/file-logs-repository";

export type LogsGroupQuery = {
  reference?: string;
  windowDays?: number;
  search?: string;
  kinds?: LogKind[];
};

function normalizeDays(windowDays?: number) {
  const DEFAULT_WINDOW_DAYS = 7;
  const MIN_WINDOW_DAYS = 1;
  const MAX_WINDOW_DAYS = 30;
  if (!Number.isFinite(windowDays)) return DEFAULT_WINDOW_DAYS;
  return Math.min(
    MAX_WINDOW_DAYS,
    Math.max(MIN_WINDOW_DAYS, Math.trunc(windowDays as number)),
  );
}

function normalizeKinds(kinds?: LogKind[]) {
  if (!kinds?.length) return [...LOG_KINDS];
  const unique = Array.from(new Set(kinds));
  return unique.filter((kind): kind is LogKind => LOG_KINDS.includes(kind));
}

export async function getGroupedLogs(
  query: LogsGroupQuery = {},
): Promise<GroupedLogsPayload> {
  const days = normalizeDays(query.windowDays);
  const reference =
    query.reference && isDateKey(query.reference)
      ? query.reference
      : toDateKey(new Date());
  const window = buildDateWindow(reference, days);
  const oldestDate = window[0] ?? reference;

  // Read logs for each day
  const allLogsByDate: Record<string, LogItem[]> = {};
  for (const date of window) {
    allLogsByDate[date] = await FileLogs.getLogsByDate(date);
  }

  // Filtering
  const filters: LogFilters = {
    search: query.search?.trim() || undefined,
    kinds: normalizeKinds(query.kinds),
  };

  function filterLog(log: LogItem) {
    if (filters.search && !log.content.includes(filters.search)) return false;
    if (filters.kinds && !filters.kinds.includes(log.kind)) return false;
    return true;
  }

  const groups = window.map((date) => ({
    date,
    items: (allLogsByDate[date] || []).filter(filterLog),
  }));

  // Stats
  const allLogs = Object.values(allLogsByDate).flat();
  const stats = {
    total: allLogs.length,
    today: allLogsByDate[toDateKey(new Date())]?.length || 0,
    filteredTotal: groups.reduce((sum, g) => sum + g.items.length, 0),
  };

  // Has more
  const allDays = await FileLogs.getLogDays();
  const hasMore = allDays.some((d) => d < oldestDate);

  return {
    groups,
    meta: {
      reference,
      days,
      oldestDate,
      nextReference: shiftDateKey(oldestDate, -1),
      hasMore,
    },
    stats,
  };
}

export async function createLog(kind: LogKind, content: string) {
  return FileLogs.addLog(kind, content);
}

export async function deleteLog(date: string, id: number) {
  return FileLogs.deleteLog(date, id);
}
