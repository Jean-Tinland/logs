"use client";

import * as React from "react";
import Loader from "jt-design-system/es/loader";
import { SnackbarProvider } from "jt-design-system/es/snackbar";
import styles from "./app-context.module.css";

type AppContextType = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

const AppContext = React.createContext<AppContextType>({
  loading: false,
  setLoading: () => {},
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

  return (
    <AppContext.Provider value={{ loading, setLoading }}>
      <SnackbarProvider>
        {children}
        {loading && <Loader variant="bar" className={styles.loader} />}
      </SnackbarProvider>
    </AppContext.Provider>
  );
}
