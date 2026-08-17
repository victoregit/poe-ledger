import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface HotkeyActionMap {
  onToggleOverlay?: () => void;
  onRefreshWealth?: () => void;
  onToggleCompact?: () => void;
}

class HotkeyService {
  private isRegistered = false;

  public async setupGlobalHotkeys(
    shortcuts: {
      toggleOverlay: string;
      refreshWealth: string;
      toggleCompact: string;
    },
    actions: HotkeyActionMap
  ): Promise<void> {
    try {
      // Unregister any previous shortcut registrations
      if (this.isRegistered) {
        await unregisterAll();
      }

      // Format for Tauri shortcut (e.g. "Control+Shift+Space" -> "CommandOrControl+Shift+Space")
      const overlayKey = shortcuts.toggleOverlay.replace(/Control/g, "CommandOrControl");
      const refreshKey = shortcuts.refreshWealth.replace(/Control/g, "CommandOrControl");

      if (overlayKey) {
        await register(overlayKey, async (event) => {
          if (event.state === "Pressed") {
            try {
              const appWindow = getCurrentWindow();
              const isVisible = await appWindow.isVisible();
              if (isVisible) {
                await appWindow.hide();
              } else {
                await appWindow.show();
                await appWindow.setFocus();
              }
            } catch {
              // Outside Tauri fallback
            }
            actions.onToggleOverlay?.();
          }
        });
      }

      if (refreshKey) {
        await register(refreshKey, (event) => {
          if (event.state === "Pressed") {
            actions.onRefreshWealth?.();
          }
        });
      }

      this.isRegistered = true;
    } catch (e) {
      console.warn("Global shortcuts not supported or failed to register (running in standard browser or dev mode):", e);
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.isRegistered) {
        await unregisterAll();
        this.isRegistered = false;
      }
    } catch {
      // Ignore
    }
  }
}

export const hotkeyService = new HotkeyService();
