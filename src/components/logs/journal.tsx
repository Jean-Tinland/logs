"use client";

import * as React from "react";
import classNames from "classnames";
import Button from "jt-design-system/es/button";
import { useSnackbar } from "jt-design-system/es/snackbar";
import Icon from "@/components/icon";
import * as API from "@/services/api";
import { buildDateWindow, shiftDateKey, toDateKey } from "@/lib/date";
import { type LogItem } from "@/types/log";
import styles from "./journal.module.css";

type Props = {
  groups: LogItem[][];
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

const WINDOW_DAYS = 5;
const INPUT_FOCUS_EVENT = "logs:input-focused";
const LOG_INPUT_SELECTOR = 'textarea[data-log-input="true"]';
const LOG_ENTRY_SELECTOR = '[data-log-entry="true"]';

type EntryRef = {
  day: string;
  id: number;
};

export default function Journal({ groups, loading, setLoading }: Props) {
  const snackbar = useSnackbar();
  const [recentGroups, setRecentGroups] = React.useState<LogItem[][]>(groups);
  const [oldGroups, setOldGroups] = React.useState<LogItem[][]>([]);
  const [selectedEntry, setSelectedEntry] = React.useState<EntryRef | null>(
    null,
  );
  const [hoveredEntry, setHoveredEntry] = React.useState<EntryRef | null>(null);

  const entryRefs = React.useRef(new Map<string, HTMLDivElement>());

  React.useEffect(() => {
    setRecentGroups(groups);
  }, [groups]);

  const journal = React.useMemo(
    () => [...oldGroups, ...recentGroups],
    [oldGroups, recentGroups],
  );

  const orderedEntries = React.useMemo(
    () =>
      journal.flatMap((group) =>
        group.map((item) => ({
          id: item.id,
          day: getLogDay(item),
        })),
      ),
    [journal],
  );

  React.useEffect(() => {
    if (selectedEntry === null) {
      return;
    }

    const hasSelectedEntry = orderedEntries.some((entry) =>
      areEntriesEqual(entry, selectedEntry),
    );

    if (!hasSelectedEntry) {
      setSelectedEntry(null);
    }
  }, [orderedEntries, selectedEntry]);

  React.useEffect(() => {
    const clearSelection = () => {
      setSelectedEntry(null);
    };

    window.addEventListener(INPUT_FOCUS_EVENT, clearSelection);
    return () => window.removeEventListener(INPUT_FOCUS_EVENT, clearSelection);
  }, []);

  React.useEffect(() => {
    if (selectedEntry === null) {
      return;
    }

    const clearSelectionOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest(LOG_ENTRY_SELECTOR)) {
        setSelectedEntry(null);
      }
    };

    const clearSelectionOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEntry(null);
      }
    };

    window.addEventListener("pointerdown", clearSelectionOnOutsidePointer);
    window.addEventListener("keydown", clearSelectionOnEscape);

    return () => {
      window.removeEventListener("pointerdown", clearSelectionOnOutsidePointer);
      window.removeEventListener("keydown", clearSelectionOnEscape);
    };
  }, [selectedEntry]);

  React.useEffect(() => {
    if (selectedEntry === null) {
      return;
    }

    const node = entryRefs.current.get(getEntryKey(selectedEntry));
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedEntry]);

  const mutateGroups = React.useCallback(
    (entryRef: EntryRef, updater: (item: LogItem) => LogItem | null) => {
      const mutate = (source: LogItem[][]) =>
        source.map((group) =>
          group.flatMap((item) => {
            if (item.id !== entryRef.id || getLogDay(item) !== entryRef.day) {
              return [item];
            }

            const nextItem = updater(item);
            return nextItem ? [nextItem] : [];
          }),
        );

      setOldGroups((current) => mutate(current));
      setRecentGroups((current) => mutate(current));
    },
    [],
  );

  const copyLog = React.useCallback(
    async (entryRef: EntryRef) => {
      const entry = findLogByEntry(journal, entryRef);
      if (!entry) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(toPlainContent(entry.content));
        snackbar.show({ type: "success", message: "Log copied" });
        return true;
      } catch {
        // Silent fail for unsupported clipboard contexts.
        return false;
      }
    },
    [journal, snackbar],
  );

  const selectEntry = React.useCallback((entryRef: EntryRef) => {
    blurLogInputField();
    setSelectedEntry(entryRef);
  }, []);

  const deleteLog = React.useCallback(
    async (entryRef: EntryRef) => {
      if (loading) {
        return false;
      }

      const orderSnapshot = [...orderedEntries];

      setLoading(true);
      try {
        await API.deleteLog(entryRef.day, entryRef.id);
        mutateGroups(entryRef, () => null);

        setSelectedEntry((current) => {
          if (!areEntriesEqual(current, entryRef)) {
            return current;
          }

          return getSiblingEntry(orderSnapshot, entryRef);
        });

        snackbar.show({ type: "success", message: "Log deleted" });
        return true;
      } finally {
        setLoading(false);
      }
    },
    [loading, mutateGroups, orderedEntries, setLoading, snackbar],
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasNavigationModifier = event.metaKey || event.ctrlKey;
      if (!hasNavigationModifier || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }

      const isLogInputFocused = isLogInputTarget(event.target);
      if (!isLogInputFocused && isTextInputTarget(event.target)) {
        return;
      }

      if (!isLogInputFocused && selectedEntry === null) {
        return;
      }

      if (!orderedEntries.length) {
        return;
      }

      event.preventDefault();

      if (isLogInputFocused) {
        if (event.key === "ArrowUp") {
          selectEntry(orderedEntries[orderedEntries.length - 1]);
        }

        return;
      }

      const currentKey = selectedEntry ? getEntryKey(selectedEntry) : null;
      const currentIndex = currentKey
        ? orderedEntries.findIndex((entry) => getEntryKey(entry) === currentKey)
        : -1;
      const index =
        currentIndex === -1 ? orderedEntries.length - 1 : currentIndex;

      if (event.key === "ArrowUp") {
        const nextIndex = Math.max(0, index - 1);
        selectEntry(orderedEntries[nextIndex]);
        return;
      }

      if (index === orderedEntries.length - 1) {
        setSelectedEntry(null);
        focusLogInputField();
        return;
      }

      selectEntry(orderedEntries[index + 1]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedEntries, selectedEntry, selectEntry]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        selectedEntry === null ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "c") {
        event.preventDefault();
        void copyLog(selectedEntry);
      }

      if (key === "d") {
        event.preventDefault();
        void deleteLog(selectedEntry);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copyLog, deleteLog, selectedEntry]);

  const loadPreviousDays = React.useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const loadedDays =
        journal.length < WINDOW_DAYS ? WINDOW_DAYS : journal.length;
      const reference = shiftDateKey(toDateKey(new Date()), -loadedDays);
      const previousDays = buildDateWindow(reference, WINDOW_DAYS);
      const groups = await Promise.all(
        previousDays.map((day) => API.getLogs(day)),
      );

      setOldGroups((current) => {
        return [...groups, ...current];
      });

      setTimeout(scrollToPageTop, 180);
    } finally {
      setLoading(false);
    }
  }, [journal, loading, setLoading]);

  return (
    <div className={styles.journal}>
      <Button
        className={styles.loadMore}
        variant="secondary"
        onClick={loadPreviousDays}
        disabled={loading}
      >
        <Icon code="plus" />
        Load 5 previous days
      </Button>
      {journal.map((group, i) => {
        if (!group.length)
          return (
            <React.Fragment key={i}>
              <div className={styles.separator} />
              <div className={styles.empty}>
                {"<"}Empty{">"}
              </div>
            </React.Fragment>
          );

        return (
          <React.Fragment key={i}>
            <div className={styles.separator} />
            {group.map(({ id, kind, content, createdAt }) => {
              const day = createdAt.slice(0, 10);
              const entryRef = { day, id };
              const entryKey = getEntryKey(entryRef);
              const isSelected = areEntriesEqual(selectedEntry, entryRef);
              const isHovered = areEntriesEqual(hoveredEntry, entryRef);
              const classes = classNames(styles.log, {
                [styles[kind]]: kind,
                [styles.selected]: isSelected,
              });

              const formattedDate = new Date(createdAt).toLocaleString(
                "en-GB",
                {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                },
              );

              return (
                <div
                  key={entryKey}
                  data-log-entry="true"
                  className={classes}
                  ref={(node) => {
                    if (node) {
                      entryRefs.current.set(entryKey, node);
                    } else {
                      entryRefs.current.delete(entryKey);
                    }
                  }}
                  onClick={() => selectEntry(entryRef)}
                  onMouseEnter={() => setHoveredEntry(entryRef)}
                  onMouseLeave={() => {
                    setHoveredEntry((current) =>
                      areEntriesEqual(current, entryRef) ? null : current,
                    );
                  }}
                >
                  <div className={styles.logMain}>
                    <div className={styles.createdAt}>[{formattedDate}]</div>
                    <div className={styles.content}>
                      {toPlainContent(content)}
                    </div>
                  </div>
                  <div
                    className={classNames(styles.actions, {
                      [styles.actionsVisible]: isSelected || isHovered,
                    })}
                  >
                    <button
                      type="button"
                      className={styles.action}
                      onClick={(event) => {
                        event.stopPropagation();
                        void copyLog(entryRef);
                      }}
                    >
                      <u>C</u>opy
                    </button>
                    <button
                      type="button"
                      className={classNames(styles.action, styles.deleteAction)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteLog(entryRef);
                      }}
                    >
                      <u>D</u>elete
                    </button>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function scrollToPageTop() {
  window.scrollTo(0, 0);
}

function isLogInputTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLTextAreaElement && target.matches(LOG_INPUT_SELECTOR)
  );
}

function blurLogInputField() {
  const field = document.querySelector<HTMLTextAreaElement>(LOG_INPUT_SELECTOR);
  field?.blur();
}

function focusLogInputField() {
  const field = document.querySelector<HTMLTextAreaElement>(LOG_INPUT_SELECTOR);
  if (!field) {
    return;
  }

  field.focus();
  const cursorPosition = field.value.length;
  field.setSelectionRange(cursorPosition, cursorPosition);
}

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;

  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function getLogDay(item: LogItem) {
  return item.createdAt.slice(0, 10);
}

function getEntryKey(entry: EntryRef) {
  return `${entry.day}:${entry.id}`;
}

function areEntriesEqual(a: EntryRef | null, b: EntryRef | null) {
  return a?.id === b?.id && a?.day === b?.day;
}

function getSiblingEntry(order: EntryRef[], selectedEntry: EntryRef) {
  const selectedKey = getEntryKey(selectedEntry);
  const selectedIndex = order.findIndex(
    (entry) => getEntryKey(entry) === selectedKey,
  );

  if (selectedIndex === -1 || order.length === 1) {
    return null;
  }

  return order[selectedIndex + 1] ?? order[selectedIndex - 1] ?? null;
}

function findLogByEntry(groups: LogItem[][], target: EntryRef) {
  for (const group of groups) {
    const item = group.find(
      (entry) => entry.id === target.id && getLogDay(entry) === target.day,
    );
    if (item) {
      return item;
    }
  }

  return null;
}

function toPlainContent(content: string) {
  return content.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");
}
