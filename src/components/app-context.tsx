"use client";

import * as React from "react";
import Loader from "jt-design-system/es/loader";
import { SnackbarProvider } from "jt-design-system/es/snackbar";
import * as PreferencesService from "@/services/preferences";
import type { Preferences } from "@/types/preferences";
import styles from "./app-context.module.css";

type AppContextType = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  preferences: Preferences;
  updatePreferences: (preferences: Preferences) => void;
};

const AppContext = React.createContext<AppContextType>({
  loading: false,
  setLoading: () => {},
  preferences: PreferencesService.DEFAULT_PREFERENCES,
  updatePreferences: () => {},
});

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return context;
}

type Props = {
  children: React.ReactNode;
};

export default function AppContextProvider({ children }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [preferences, setPreferences] = React.useState<Preferences>(
    PreferencesService.DEFAULT_PREFERENCES,
  );

  const updatePreferences = React.useCallback(
    (nextPreferences: Preferences) => {
      setPreferences(nextPreferences);
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{ loading, setLoading, preferences, updatePreferences }}
    >
      <SnackbarProvider>
        {children}
        {loading && <Loader variant="bar" className={styles.loader} />}
      </SnackbarProvider>
    </AppContext.Provider>
  );
}
