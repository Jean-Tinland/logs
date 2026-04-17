"use client";

import * as React from "react";
import Button from "jt-design-system/es/button";
import Icon from "@/components/icon";
import type { LogItem } from "@/types/log";
import * as API from "@/services/api";
import Journal from "@/components/logs/journal";
import InputField from "@/components/logs/input-field";
import Settings from "@/components/settings";
import styles from "./logs.module.css";

type Props = {
  groups: LogItem[][];
  days: number;
};

export default function Logs({ groups: defaultGroups, days }: Props) {
  const [groups, setGroups] = React.useState(defaultGroups);
  const [loading, setLoading] = React.useState(false);
  const [settingsOpened, setSettingsOpened] = React.useState(false);

  const refreshLatest = React.useCallback(async () => {
    const latestGroups = await API.getLatestGroups(days);
    setGroups(latestGroups);
  }, [days]);

  const openSettings = React.useCallback(() => {
    setSettingsOpened(true);
  }, []);

  const closeSettings = React.useCallback(() => {
    setSettingsOpened(false);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === ",";

      if (!isShortcut || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      setSettingsOpened(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={styles.logs}>
      <div className={styles.controls}>
        <Button
          className={styles.settings}
          onClick={openSettings}
          aria-label="Open settings"
          title="Open settings"
        >
          <Icon code="settings" />
        </Button>
      </div>
      <Journal groups={groups} loading={loading} setLoading={setLoading} />
      <InputField
        loading={loading}
        setLoading={setLoading}
        onLogCreated={refreshLatest}
      />
      <Settings opened={settingsOpened} close={closeSettings} />
    </div>
  );
}
