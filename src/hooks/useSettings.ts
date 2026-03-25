import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "midnight" | "forest";
export type FontSize = "small" | "medium" | "large";
export interface Settings {
  theme: Theme;
  fontSize: FontSize;
  showSidebar: boolean;
  contentWidth: number; // percentage 20–100
}

const STORAGE_KEY = "quizme-settings";

const defaults: Settings = {
  theme: "dark",
  fontSize: "medium",
  showSidebar: true,
  contentWidth: 80,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function save(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  // Apply theme + font size to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.style.fontSize = fontSizeMap[settings.fontSize];
  }, [settings.theme, settings.fontSize]);

  return { settings, update };
}
