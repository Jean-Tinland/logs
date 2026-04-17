export const THEMES = ["auto", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];
