"use client";

import * as React from "react";
import Button from "jt-design-system/es/button";
import Tooltip from "jt-design-system/es/tooltip";
import Icon from "@/components/icon";
import type { LogItem } from "@/types/log";
import * as API from "@/services/api";
import Journal from "@/components/logs/journal";
import InputField from "@/components/logs/input-field";
import SearchPalette from "@/components/logs/search-palette";
import Settings from "@/components/settings";
import styles from "./logs.module.css";

type Props = {
  groups: LogItem[][];
  days: number;
};

export default function Logs({ groups: defaultGroups, days }: Props) {
  const [groups, setGroups] = React.useState(defaultGroups);
  const [loading, setLoading] = React.useState(false);
  const [searchOpened, setSearchOpened] = React.useState(false);
  const [settingsOpened, setSettingsOpened] = React.useState(false);
  const [searchRefreshKey, setSearchRefreshKey] = React.useState(0);
  const [focusRequest, setFocusRequest] = React.useState<{
    day: string;
    id: number;
    nonce: number;
  } | null>(null);

  const refreshLatest = React.useCallback(async () => {
    const latestGroups = await API.getLatestGroups(days);
    setGroups(latestGroups);
    setSearchRefreshKey((current) => current + 1);
  }, [days]);

  const openSearch = React.useCallback(() => {
    setSearchOpened(true);
  }, []);

  const closeSearch = React.useCallback(() => {
    setSearchOpened(false);
  }, []);

  const openSettings = React.useCallback(() => {
    setSettingsOpened(true);
  }, []);

  const closeSettings = React.useCallback(() => {
    setSettingsOpened(false);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) && event.key === "k";
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === ",";

      if (isSearchShortcut && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        setSearchOpened(true);
        return;
      }

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
      <div className={`${styles.controls} ${styles.controlsLeft}`}>
        <Tooltip content="Open search (cmd/ctrl+k)">
          <Button
            className={styles.trigger}
            onClick={openSearch}
            aria-label="Open search"
          >
            <Icon code="search" />
          </Button>
        </Tooltip>
      </div>
      <div className={`${styles.controls} ${styles.controlsRight}`}>
        <Tooltip content="Open settings">
          <Button
            className={styles.trigger}
            onClick={openSettings}
            aria-label="Open settings"
          >
            <Icon code="settings" />
          </Button>
        </Tooltip>
      </div>
      <Journal
        groups={groups}
        loading={loading}
        setLoading={setLoading}
        focusRequest={focusRequest}
      />
      <InputField
        loading={loading}
        setLoading={setLoading}
        onLogCreated={refreshLatest}
      />
      <SearchPalette
        opened={searchOpened}
        refreshKey={searchRefreshKey}
        onClose={closeSearch}
        onSelectResult={(result) => {
          setFocusRequest({ ...result, nonce: Date.now() });
        }}
      />
      <Settings opened={settingsOpened} close={closeSettings} />
    </div>
  );
}
