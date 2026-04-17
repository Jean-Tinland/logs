import {
  buildDateWindow,
  isDateKey,
  shiftDateKey,
  toDateKey,
} from "@/lib/date";
import {
  createSearchSnippet,
  normalizeSearchQuery,
  splitSearchTerms,
  toPlainLogContent,
} from "@/lib/log-content";
import {
  LOG_KINDS,
  type GroupedLogsPayload,
  type LogFilters,
  type LogItem,
  type LogKind,
  type SearchLogsPayload,
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

function normalizeOffset(offset?: number) {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.trunc(offset as number));
}

function normalizeLimit(limit?: number) {
  const DEFAULT_LIMIT = 20;
  const MIN_LIMIT = 1;
  const MAX_LIMIT = 50;

  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;

  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.trunc(limit as number)));
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
    if (
      filters.search &&
      !toPlainLogContent(log.content)
        .toLocaleLowerCase()
        .includes(normalizeSearchQuery(filters.search))
    ) {
      return false;
    }

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

export type SearchLogsQuery = {
  query?: string;
  kinds?: LogKind[];
  offset?: number;
  limit?: number;
};

export async function searchLogs(
  query: SearchLogsQuery = {},
): Promise<SearchLogsPayload> {
  const startedAt = Date.now();
  const normalizedQuery = normalizeSearchQuery(query.query ?? "");
  const searchTerms = splitSearchTerms(normalizedQuery);
  const kinds = normalizeKinds(query.kinds);
  const offset = normalizeOffset(query.offset);
  const limit = normalizeLimit(query.limit);
  const entries = await FileLogs.getSearchableLogsNewestFirst();

  const filteredEntries = entries.filter((entry) => kinds.includes(entry.kind));

  const rankedEntries = searchTerms.length
    ? filteredEntries
        .map((entry) => {
          const positions = searchTerms.map((term) =>
            entry.searchText.indexOf(term),
          );

          if (positions.some((position) => position === -1)) {
            return null;
          }

          const earliest = Math.min(...positions);
          const latest = Math.max(...positions);
          const phraseIndex = entry.searchText.indexOf(normalizedQuery);
          const score =
            searchTerms.length * 120 +
            Math.max(0, 200 - earliest) +
            Math.max(0, 120 - (latest - earliest)) +
            (phraseIndex === -1 ? 0 : Math.max(0, 260 - phraseIndex));

          return { entry, score };
        })
        .filter(
          (
            candidate,
          ): candidate is {
            entry: FileLogs.SearchableLogEntry;
            score: number;
          } => Boolean(candidate),
        )
        .sort((left, right) => {
          if (right.score === left.score) {
            return right.entry.createdAt.localeCompare(left.entry.createdAt);
          }

          return right.score - left.score;
        })
    : filteredEntries.map((entry) => ({ entry, score: 0 }));

  const pagedEntries = rankedEntries.slice(offset, offset + limit);
  const results = pagedEntries.map(({ entry }) => {
    const { snippet, matches } = createSearchSnippet(
      entry.plainContent,
      normalizedQuery,
    );

    return {
      id: entry.id,
      day: entry.day,
      kind: entry.kind,
      content: entry.plainContent,
      snippet,
      matches,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  });

  return {
    query: normalizedQuery,
    results,
    meta: {
      total: rankedEntries.length,
      limit,
      offset,
      nextOffset:
        offset + results.length < rankedEntries.length
          ? offset + results.length
          : null,
      hasMore: offset + results.length < rankedEntries.length,
      browsing: !searchTerms.length,
      tookMs: Date.now() - startedAt,
    },
  };
}
