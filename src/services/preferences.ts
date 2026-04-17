import type { Preferences } from "@/types/preferences";

const MONOSPACE_STACK =
  'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace';

const SANS_STACK =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SERIF_STACK =
  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

export const FONT_FAMILY_OPTIONS = [
  { value: MONOSPACE_STACK, label: "Monospace" },
  { value: SANS_STACK, label: "Sans Serif" },
  { value: SERIF_STACK, label: "Serif" },
] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "auto",
  fontFamily: MONOSPACE_STACK,
};

const STORAGE_KEY = "preferences";
const FONT_STYLE_ID = "dynamic-font-family";

export function getPreferences(): Preferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function applyTheme(theme: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

function applyFontFamily(fontFamily: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const existingStyle = document.getElementById(FONT_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  const value =
    fontFamily.trim().length > 0
      ? `${fontFamily}, var(--default-font)`
      : "var(--default-font)";

  const style = Object.assign(document.createElement("style"), {
    id: FONT_STYLE_ID,
    textContent: `
      :root {
        --content-font: ${value};
      }
    `,
  });

  document.head.appendChild(style);
}

export function applyPreferences(preferences: Preferences): void {
  applyTheme(preferences.theme || DEFAULT_PREFERENCES.theme);
  applyFontFamily(preferences.fontFamily || DEFAULT_PREFERENCES.fontFamily);
}

export function updatePreference(
  key: keyof Preferences,
  value: Preferences[keyof Preferences],
): void {
  const current = getPreferences();
  const updated = { ...current, [key]: value };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  applyPreferences(updated);
}
