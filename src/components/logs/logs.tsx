"use client";

import * as React from "react";
import type { LogItem } from "@/types/log";
import * as API from "@/services/api";
import Journal from "@/components/logs/journal";
import InputField from "@/components/logs/input-field";
import styles from "./logs.module.css";

type Props = {
  groups: LogItem[][];
  days: number;
};

export default function Logs({ groups: defaultGroups, days }: Props) {
  const [groups, setGroups] = React.useState(defaultGroups);
  const [loading, setLoading] = React.useState(false);

  const refreshLatest = React.useCallback(async () => {
    const latestGroups = await API.getLatestGroups(days);
    setGroups(latestGroups);
  }, [days]);

  return (
    <div className={styles.logs}>
      <Journal groups={groups} loading={loading} setLoading={setLoading} />
      <InputField
        loading={loading}
        setLoading={setLoading}
        onLogCreated={refreshLatest}
      />
    </div>
  );
}
