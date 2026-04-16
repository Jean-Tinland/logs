import fs from "node:fs/promises";
import path from "node:path";
import { toDateKey } from "@/lib/date";
import type { LogItem, LogKind } from "@/types/log";

const LOGS_DIR = path.join(process.cwd(), "contents", "logs");

async function ensureLogsDir() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

function getLogFilePath(date: string) {
  return path.join(LOGS_DIR, `${date}.json`);
}

async function readLogsFile(date: string): Promise<LogItem[]> {
  const filePath = getLogFilePath(date);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as LogItem[];
  } catch {
    return [];
  }
}

async function writeLogsFile(date: string, logs: LogItem[]) {
  const filePath = getLogFilePath(date);
  await fs.writeFile(filePath, JSON.stringify(logs, null, 2), "utf-8");
}

export async function getLogsByDate(date: string): Promise<LogItem[]> {
  await ensureLogsDir();
  return readLogsFile(date);
}

export async function addLog(kind: LogKind, content: string): Promise<LogItem> {
  await ensureLogsDir();

  const now = new Date();
  const dateKey = toDateKey(now);
  const logs = await readLogsFile(dateKey);

  const id = logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 1;
  const log: LogItem = {
    id,
    kind,
    content,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  logs.push(log);
  await writeLogsFile(dateKey, logs);

  return log;
}

export async function deleteLog(date: string, id: number): Promise<boolean> {
  await ensureLogsDir();

  const logs = await readLogsFile(date);
  const newLogs = logs.filter((l) => l.id !== id);

  if (newLogs.length === logs.length) return false;

  await writeLogsFile(date, newLogs);

  return true;
}

export async function getLogDays(): Promise<string[]> {
  await ensureLogsDir();
  const files = await fs.readdir(LOGS_DIR);

  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

export async function getAllLogsNewestFirst(): Promise<LogItem[]> {
  const days = await getLogDays();
  const logsByDay = await Promise.all(days.map((day) => readLogsFile(day)));

  return logsByDay
    .flat()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
