import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../http/isTauri";

export interface GameStatus {
  isLogDetected: boolean;
  logPath: string | null;
  currentZone: string | null;
}

class GameWatcherService {
  private logPath: string | null = null;
  private currentZone: string | null = null;
  private intervalId: number | null = null;
  private listeners: Set<(status: GameStatus) => void> = new Set();

  constructor() {
    this.init();
  }

  private async init() {
    if (!isTauri()) return;

    try {
      this.logPath = await invoke<string | null>("detect_poe_client_log");
      if (this.logPath) {
        this.updateZone();
        // Check game events every 3 seconds
        this.intervalId = window.setInterval(() => this.updateZone(), 3000);
      }
    } catch {
      // Ignore
    }
  }

  public async updateZone(): Promise<void> {
    if (!isTauri()) return;

    try {
      const zone = await invoke<string | null>("get_last_game_zone", {
        logPath: this.logPath,
      });

      if (zone && zone !== this.currentZone) {
        this.currentZone = zone;
        this.notify();
      }
    } catch {
      // Ignore
    }
  }

  public async openInAppLogin(): Promise<void> {
    if (isTauri()) {
      await invoke("open_ggg_login_window");
    } else {
      window.open("https://www.pathofexile.com/login", "_blank");
    }
  }

  public getStatus(): GameStatus {
    return {
      isLogDetected: Boolean(this.logPath),
      logPath: this.logPath,
      currentZone: this.currentZone,
    };
  }

  public subscribe(listener: (status: GameStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const st = this.getStatus();
    for (const l of this.listeners) {
      l(st);
    }
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const gameWatcherService = new GameWatcherService();
