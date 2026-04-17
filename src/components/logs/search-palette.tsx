"use client";

import * as React from "react";
import Button from "jt-design-system/es/button";
import Dialog from "jt-design-system/es/dialog";
import Icon from "@/components/icon";
import * as API from "@/services/api";
import type { SearchLogResult, SearchLogsPayload } from "@/types/log";
import styles from "./search-palette.module.css";

type Props = {
  opened: boolean;
  refreshKey: number;
  onClose: () => void;
  onSelectResult: (entry: { day: string; id: number }) => void;
};

const DEFAULT_LIMIT = 50;
const MATCH_HIGHLIGHT_NAME = "logs-search-match";
const ACTIVE_HIGHLIGHT_NAME = "logs-search-active-match";

export default function SearchPalette({
  opened,
  refreshKey,
  onClose,
  onSelectResult,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const snippetRefs = React.useRef(new Map<string, HTMLParagraphElement>());

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchLogResult[]>([]);
  const [meta, setMeta] = React.useState<SearchLogsPayload["meta"] | null>(
    null,
  );
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length > 2;
  const activeResult = results[selectedIndex] ?? null;

  const runSearch = React.useCallback(
    async ({ append, offset, signal }: SearchRequest) => {
      const payload = await API.searchLogs({
        query: trimmedQuery,
        offset,
        limit: DEFAULT_LIMIT,
        signal,
      });

      setError(null);
      setMeta(payload.meta);
      setResults((current) =>
        append ? [...current, ...payload.results] : payload.results,
      );

      if (!append) {
        setSelectedIndex(payload.results.length ? 0 : -1);
      }
    },
    [trimmedQuery],
  );

  React.useEffect(() => {
    if (!opened) {
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [opened]);

  React.useEffect(() => {
    if (!opened) {
      return;
    }

    if (!canSearch) {
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setMeta(null);
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void runSearch({ append: false, offset: 0, signal: controller.signal })
        .catch((searchError) => {
          if (controller.signal.aborted) {
            return;
          }

          setError(
            searchError instanceof Error
              ? searchError.message
              : "Search failed",
          );
          setResults([]);
          setMeta(null);
          setSelectedIndex(-1);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [canSearch, opened, refreshKey, runSearch]);

  React.useEffect(() => {
    if (!opened) {
      clearSearchHighlights();
      return;
    }

    const registry = getHighlightRegistry();

    if (!registry) {
      return;
    }

    const matchesHighlight = new Highlight();
    const activeHighlight = new Highlight();

    for (const [index, result] of results.entries()) {
      const node = snippetRefs.current.get(getResultKey(result));

      if (!node || !result.matches.length) {
        continue;
      }

      for (const range of createRanges(node, result.matches)) {
        if (index === selectedIndex) {
          activeHighlight.add(range);
        } else {
          matchesHighlight.add(range);
        }
      }
    }

    registry.set(MATCH_HIGHLIGHT_NAME, matchesHighlight);
    registry.set(ACTIVE_HIGHLIGHT_NAME, activeHighlight);

    return () => {
      registry.delete(MATCH_HIGHLIGHT_NAME);
      registry.delete(ACTIVE_HIGHLIGHT_NAME);
    };
  }, [opened, results, selectedIndex]);

  const loadMore = React.useCallback(async () => {
    if (!meta?.hasMore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    try {
      await runSearch({
        append: true,
        offset: meta.nextOffset ?? results.length,
      });
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Search failed",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, meta, results.length, runSearch]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!results.length) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) =>
          Math.min(results.length - 1, Math.max(0, current + 1)),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.key === "Enter" && activeResult) {
        event.preventDefault();
        onSelectResult({ day: activeResult.day, id: activeResult.id });
        onClose();
      }
    },
    [activeResult, onClose, onSelectResult, results.length],
  );

  React.useEffect(() => {
    if (!activeResult) {
      return;
    }

    const selectedNode = document.getElementById(getOptionId(activeResult));
    selectedNode?.scrollIntoView({ block: "nearest" });
  }, [activeResult]);

  if (!opened) {
    return null;
  }

  return (
    <Dialog
      className={styles.dialog}
      isOpened={opened}
      close={onClose}
      showCloseButton={false}
      title="Search journal"
      description="Search saved journal entries"
    >
      <div className={styles.inner}>
        <label className={styles.searchField}>
          <Icon code="search" className={styles.searchIcon} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search journal entries"
            aria-label="Search journal entries"
            aria-controls="search-results"
            aria-activedescendant={
              activeResult ? getOptionId(activeResult) : undefined
            }
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <div className={styles.meta}>
          {!canSearch
            ? "Type at least 3 characters"
            : loading
              ? "Searching..."
              : `${meta?.total ?? 0} results`}
        </div>

        {error ? <div className={styles.emptyState}>{error}</div> : null}

        {!error && canSearch && !loading && !results.length ? (
          <div className={styles.emptyState}>No matches.</div>
        ) : null}

        {results.length ? (
          <div
            id="search-results"
            className={styles.results}
            role="listbox"
            aria-label="Search results"
          >
            {results.map((result, index) => {
              const isActive = index === selectedIndex;

              return (
                <button
                  key={getResultKey(result)}
                  id={getOptionId(result)}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`${styles.result} ${isActive ? styles.resultActive : ""}`.trim()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    onSelectResult({ day: result.day, id: result.id });
                    onClose();
                  }}
                >
                  <div className={styles.resultDate}>
                    {formatDate(result.createdAt)}
                  </div>
                  <p
                    ref={(node) => {
                      const key = getResultKey(result);

                      if (node) {
                        snippetRefs.current.set(key, node);
                      } else {
                        snippetRefs.current.delete(key);
                      }
                    }}
                    className={styles.snippet}
                  >
                    {result.snippet}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}

        {canSearch && meta?.hasMore ? (
          <Button
            className={styles.loadMore}
            variant="secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
}

type SearchRequest = {
  append: boolean;
  offset: number;
  signal?: AbortSignal;
};

function getResultKey(result: SearchLogResult) {
  return `${result.day}:${result.id}`;
}

function getOptionId(result: SearchLogResult) {
  return `search-result-${result.day}-${result.id}`;
}

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function createRanges(
  root: HTMLElement,
  matches: Array<{ start: number; end: number }>,
) {
  const textNodes = collectTextNodes(root);

  return matches
    .map((match) => createRangeFromOffsets(textNodes, match.start, match.end))
    .filter((range): range is Range => Boolean(range));
}

function collectTextNodes(root: HTMLElement) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    if (walker.currentNode instanceof Text) {
      nodes.push(walker.currentNode);
    }
  }

  return nodes;
}

function createRangeFromOffsets(textNodes: Text[], start: number, end: number) {
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;
  let cursor = 0;

  for (const node of textNodes) {
    const nextCursor = cursor + node.data.length;

    if (!startNode && start >= cursor && start <= nextCursor) {
      startNode = node;
      startOffset = start - cursor;
    }

    if (!endNode && end >= cursor && end <= nextCursor) {
      endNode = node;
      endOffset = end - cursor;
      break;
    }

    cursor = nextCursor;
  }

  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function getHighlightRegistry(): HighlightRegistryLike | null {
  if (typeof CSS === "undefined" || typeof Highlight === "undefined") {
    return null;
  }

  const registry = (CSS as typeof CSS & { highlights?: HighlightRegistryLike })
    .highlights;

  return registry ?? null;
}

function clearSearchHighlights() {
  const registry = getHighlightRegistry();

  if (!registry) {
    return;
  }

  registry.delete(MATCH_HIGHLIGHT_NAME);
  registry.delete(ACTIVE_HIGHLIGHT_NAME);
}

type HighlightRegistryLike = {
  set: (name: string, highlight: Highlight) => void;
  delete: (name: string) => void;
};
