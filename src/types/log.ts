export const LOG_KINDS = ["normal", "highlight", "warn", "danger"] as const;

export type LogKind = (typeof LOG_KINDS)[number];

export type LogItem = {
  id: number;
  kind: LogKind;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type LogGroup = {
  date: string;
  items: LogItem[];
};

export type LogFilters = {
  search?: string;
  kinds?: LogKind[];
};

export type GroupedLogsPayload = {
  groups: LogGroup[];
  meta: {
    reference: string;
    days: number;
    oldestDate: string;
    nextReference: string;
    hasMore: boolean;
  };
  stats: {
    total: number;
    today: number;
    filteredTotal: number;
  };
};
