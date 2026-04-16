import Logs from "@/components/logs/logs";
import { getGroupedLogs } from "@/lib/logs-repository";
import type { LogItem } from "@/types/log";
import styles from "./page.module.css";

const DEFAULT_DAYS = 5;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchInitialGroups(days: number): Promise<LogItem[][]> {
  const payload = await getGroupedLogs({ windowDays: days });
  return payload.groups.map((group) => group.items);
}

export default async function HomePage() {
  const groups = await fetchInitialGroups(DEFAULT_DAYS);
  return (
    <main className={styles.main} data-logs>
      <Logs groups={groups} days={DEFAULT_DAYS} />
    </main>
  );
}
