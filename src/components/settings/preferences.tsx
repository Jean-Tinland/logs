"use client";

import Select from "jt-design-system/es/select";
import { useAppContext } from "@/components/app-context";
import * as PreferencesService from "@/services/preferences";
import type { Preferences as PreferencesType } from "@/types/preferences";
import styles from "./preferences.module.css";

const THEME_OPTIONS = [
  { value: "auto", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Preferences() {
  const { preferences, updatePreferences } = useAppContext();
  const { theme, fontFamily } = preferences;

  const updatePreference =
    (key: keyof PreferencesType) => (value: string | boolean) => {
      PreferencesService.updatePreference(key, String(value));
      const updated = PreferencesService.getPreferences();
      updatePreferences(updated);
    };

  return (
    <div className={styles.container}>
      <Select
        label="Theme"
        className={styles.field}
        value={theme}
        onValueChange={updatePreference("theme")}
        options={THEME_OPTIONS}
        compact
      />
      <Select
        label="Font family"
        className={styles.field}
        value={fontFamily}
        onValueChange={updatePreference("fontFamily")}
        options={[...PreferencesService.FONT_FAMILY_OPTIONS]}
        compact
      />
    </div>
  );
}
