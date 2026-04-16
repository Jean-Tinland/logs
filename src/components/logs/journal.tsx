"use client";

import * as React from "react";
import classNames from "classnames";
import Button from "jt-design-system/es/button";
import PlusIcon from "jt-design-system/es/icons/plus";
import { useSnackbar } from "jt-design-system/es/snackbar";
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

export default function Journal({ groups, loading, setLoading }: Props) {
  const snackbar = useSnackbar();
  const [recentGroups, setRecentGroups] = React.useState<LogItem[][]>(groups);
  const [oldGroups, setOldGroups] = React.useState<LogItem[][]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);

  const entryRefs = React.useRef(new Map<number, HTMLDivElement>());

  React.useEffect(() => {
    setRecentGroups(groups);
  }, [groups]);

  const journal = React.useMemo(
    () => [...oldGroups, ...recentGroups],
    [oldGroups, recentGroups],
  );

  const entryOrder = React.useMemo(
    () => journal.flatMap((group) => group.map((item) => item.id)),
    [journal],
  );

  React.useEffect(() => {
    if (selectedId !== null && !entryOrder.includes(selectedId)) {
      setSelectedId(null);
    }
  }, [entryOrder, selectedId]);

  React.useEffect(() => {
    const clearSelection = () => {
      setSelectedId(null);
    };

    window.addEventListener(INPUT_FOCUS_EVENT, clearSelection);
    return () => window.removeEventListener(INPUT_FOCUS_EVENT, clearSelection);
  }, []);

  React.useEffect(() => {
    if (selectedId === null) {
      return;
    }

    const node = entryRefs.current.get(selectedId);
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const mutateGroups = React.useCallback(
    (id: number, updater: (item: LogItem) => LogItem | null) => {
      const mutate = (source: LogItem[][]) =>
        source.map((group) =>
          group.flatMap((item) => {
            if (item.id !== id) {
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
    async (id: number) => {
      const entry = findLogById(journal, id);
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

  const selectEntry = React.useCallback((id: number) => {
    blurLogInputField();
    setSelectedId(id);
  }, []);

  const deleteLog = React.useCallback(
    async (id: number) => {
      if (loading) {
        return false;
      }

      // Find the date for this log id
      let date: string | undefined;
      for (const group of journal) {
        const found = group.find((item) => item.id === id);
        if (found) {
          date = found.createdAt.slice(0, 10);
          break;
        }
      }
      if (!date) {
        alert("Could not determine log date.");
        return false;
      }

      const orderSnapshot = [...entryOrder];

      setLoading(true);
      try {
        await API.deleteLog(date, id);
        mutateGroups(id, () => null);

        setSelectedId((current) => {
          if (current !== id) {
            return current;
          }

          return getSiblingId(orderSnapshot, id);
        });

        snackbar.show({ type: "success", message: "Log deleted" });
        return true;
      } finally {
        setLoading(false);
      }
    },
    [entryOrder, loading, mutateGroups, setLoading, journal, snackbar],
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

      if (!isLogInputFocused && selectedId === null) {
        return;
      }

      if (!entryOrder.length) {
        return;
      }

      event.preventDefault();

      if (isLogInputFocused) {
        if (event.key === "ArrowUp") {
          selectEntry(entryOrder[entryOrder.length - 1]);
        }

        return;
      }

      const currentIndex = entryOrder.indexOf(selectedId ?? -1);
      const index = currentIndex === -1 ? entryOrder.length - 1 : currentIndex;

      if (event.key === "ArrowUp") {
        const nextIndex = Math.max(0, index - 1);
        selectEntry(entryOrder[nextIndex]);
        return;
      }

      if (index === entryOrder.length - 1) {
        setSelectedId(null);
        focusLogInputField();
        return;
      }

      selectEntry(entryOrder[index + 1]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entryOrder, selectedId, selectEntry]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        selectedId === null ||
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
        void copyLog(selectedId);
      }

      if (key === "d") {
        event.preventDefault();
        void deleteLog(selectedId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copyLog, deleteLog, selectedId]);

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
        <PlusIcon />
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
              const isSelected = selectedId === id;
              const isHovered = hoveredId === id;
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
                  key={id}
                  className={classes}
                  ref={(node) => {
                    if (node) {
                      entryRefs.current.set(id, node);
                    } else {
                      entryRefs.current.delete(id);
                    }
                  }}
                  onClick={() => selectEntry(id)}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => {
                    setHoveredId((current) =>
                      current === id ? null : current,
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
                        void copyLog(id);
                      }}
                    >
                      <u>C</u>opy
                    </button>
                    <button
                      type="button"
                      className={classNames(styles.action, styles.deleteAction)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteLog(id);
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

function getSiblingId(order: number[], selectedId: number) {
  const selectedIndex = order.indexOf(selectedId);

  if (selectedIndex === -1 || order.length === 1) {
    return null;
  }

  return order[selectedIndex + 1] ?? order[selectedIndex - 1] ?? null;
}

function findLogById(groups: LogItem[][], id: number) {
  for (const group of groups) {
    const item = group.find((entry) => entry.id === id);
    if (item) {
      return item;
    }
  }

  return null;
}

function toPlainContent(content: string) {
  return content.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");
}
