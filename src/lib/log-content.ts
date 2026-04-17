export type TextRange = {
  start: number;
  end: number;
};

const WHITESPACE_RE = /\s+/g;

export function toPlainLogContent(content: string): string {
  return content.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");
}

export function collapseWhitespace(value: string): string {
  return value.replace(WHITESPACE_RE, " ").trim();
}

export function normalizeSearchQuery(value: string): string {
  return collapseWhitespace(value).toLocaleLowerCase();
}

export function splitSearchTerms(query: string): string[] {
  return normalizeSearchQuery(query).split(" ").filter(Boolean);
}

export function findMatchRanges(
  value: string,
  terms: string[],
  maxMatches = 32,
): TextRange[] {
  if (!value || !terms.length || maxMatches <= 0) {
    return [];
  }

  const haystack = value.toLocaleLowerCase();
  const uniqueTerms = Array.from(
    new Set(terms.map((term) => term.trim()).filter(Boolean)),
  ).sort((left, right) => right.length - left.length);

  const ranges: TextRange[] = [];

  for (const term of uniqueTerms) {
    let startIndex = 0;

    while (startIndex < haystack.length && ranges.length < maxMatches) {
      const matchIndex = haystack.indexOf(term, startIndex);

      if (matchIndex === -1) {
        break;
      }

      ranges.push({
        start: matchIndex,
        end: matchIndex + term.length,
      });

      startIndex = matchIndex + Math.max(1, term.length);
    }

    if (ranges.length >= maxMatches) {
      break;
    }
  }

  return mergeRanges(ranges).slice(0, maxMatches);
}

export function createSearchSnippet(
  value: string,
  query: string,
  maxLength = 220,
): {
  snippet: string;
  matches: TextRange[];
} {
  const source = collapseWhitespace(value);

  if (!source) {
    return { snippet: "", matches: [] };
  }

  const normalizedQuery = normalizeSearchQuery(query);
  const terms = splitSearchTerms(normalizedQuery);

  if (!terms.length) {
    return {
      snippet: truncateText(source, maxLength),
      matches: [],
    };
  }

  const allMatches = findMatchRanges(source, terms, 64);
  const phraseIndex = normalizedQuery
    ? source.toLocaleLowerCase().indexOf(normalizedQuery)
    : -1;
  const anchor =
    phraseIndex !== -1
      ? { start: phraseIndex, end: phraseIndex + normalizedQuery.length }
      : allMatches[0];

  if (!anchor) {
    return {
      snippet: truncateText(source, maxLength),
      matches: [],
    };
  }

  const preferredStart = Math.max(
    0,
    anchor.start - Math.floor(maxLength * 0.4),
  );
  let start = moveToWordBoundary(source, preferredStart, -1);
  let end = Math.min(source.length, start + maxLength);

  if (end < source.length) {
    end = moveToWordBoundary(source, end, 1);
  }

  if (end - start > maxLength + 24) {
    end = Math.min(source.length, start + maxLength);
  }

  if (end === source.length && end - start < maxLength) {
    start = Math.max(0, end - maxLength);
  }

  let snippetBody = source.slice(start, end);
  const trimmedStart = snippetBody.length - snippetBody.trimStart().length;
  const trimmedEnd = snippetBody.length - snippetBody.trimEnd().length;
  start += trimmedStart;
  end -= trimmedEnd;
  snippetBody = source.slice(start, end);

  const prefix = start > 0 ? "…" : "";
  const suffix = end < source.length ? "…" : "";
  const snippet = `${prefix}${snippetBody}${suffix}`;

  const matches = mergeRanges(
    allMatches
      .filter((match) => match.end > start && match.start < end)
      .map((match) => ({
        start: Math.max(match.start, start) - start + prefix.length,
        end: Math.min(match.end, end) - start + prefix.length,
      })),
  );

  return { snippet, matches };
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (!ranges.length) {
    return [];
  }

  const sorted = [...ranges].sort((left, right) => {
    if (left.start === right.start) {
      return left.end - right.end;
    }

    return left.start - right.start;
  });

  const merged: TextRange[] = [sorted[0]];

  for (const range of sorted.slice(1)) {
    const previous = merged[merged.length - 1];

    if (range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      continue;
    }

    merged.push({ ...range });
  }

  return merged;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function moveToWordBoundary(
  value: string,
  index: number,
  direction: -1 | 1,
): number {
  const limit = 18;
  let cursor = index;
  let steps = 0;

  while (steps < limit && cursor > 0 && cursor < value.length) {
    const current = value[cursor];
    const previous = value[cursor - 1];

    if (direction === -1 && /\s/.test(previous)) {
      return cursor;
    }

    if (direction === 1 && /\s/.test(current)) {
      return cursor;
    }

    cursor += direction;
    steps += 1;
  }

  return Math.max(0, Math.min(value.length, cursor));
}
