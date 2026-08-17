import { useState, useEffect } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "../types/settings";

const STORAGE_KEY = "poe_ledger_settings_v1";

class SettingsManager {
  private settings: AppSettings;
  private listeners: Set<(settings: AppSettings) => void> = new Set();

  constructor() {
    this.settings = this.loadFromStorage();
    this.applyCssVariables(this.settings);
  }

  private loadFromStorage(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          overlay: { ...DEFAULT_SETTINGS.overlay, ...(parsed.overlay || {}) },
          wealth: { ...DEFAULT_SETTINGS.wealth, ...(parsed.wealth || {}) },
          hotkeys: { ...DEFAULT_SETTINGS.hotkeys, ...(parsed.hotkeys || {}) },
          account: { ...DEFAULT_SETTINGS.account, ...(parsed.account || {}) },
          enabledModules: { ...DEFAULT_SETTINGS.enabledModules, ...(parsed.enabledModules || {}) },
        };
      }
    } catch {
      // Failed to parse, use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public updateSettings(partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)): void {
    if (typeof partial === "function") {
      this.settings = partial(this.settings);
    } else {
      this.settings = {
        ...this.settings,
        ...partial,
        overlay: { ...this.settings.overlay, ...(partial.overlay || {}) },
        wealth: { ...this.settings.wealth, ...(partial.wealth || {}) },
        hotkeys: { ...this.settings.hotkeys, ...(partial.hotkeys || {}) },
        account: { ...this.settings.account, ...(partial.account || {}) },
        enabledModules: { ...this.settings.enabledModules, ...(partial.enabledModules || {}) },
      };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Failed to persist settings to localStorage", e);
    }

    this.applyCssVariables(this.settings);
    this.notify();
  }

  public resetDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.applyCssVariables(this.settings);
    this.notify();
  }

  private applyCssVariables(settings: AppSettings): void {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--overlay-opacity", settings.overlay.opacity.toString());
      root.style.setProperty("--overlay-scale", settings.overlay.scale.toString());
    }
  }

  public subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }
}

export const settingsManager = new SettingsManager();

export function useSettings(): [AppSettings, (partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void] {
  const [settings, setSettings] = useState<AppSettings>(() => settingsManager.getSettings());

  useEffect(() => {
    return settingsManager.subscribe((updated) => {
      setSettings(updated);
    });
  }, []);

  const update = (partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => {
    settingsManager.updateSettings(partial);
  };

  return [settings, update];
}
