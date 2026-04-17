"use client";

import { useEffect } from "react";
import { useAppContext } from "@/components/app-context";
import * as PreferencesService from "@/services/preferences";

export default function PreferencesInitializer() {
  const { updatePreferences } = useAppContext();

  useEffect(() => {
    const preferences = PreferencesService.getPreferences();
    updatePreferences(preferences);
    PreferencesService.applyPreferences(preferences);
  }, [updatePreferences]);

  return null;
}
