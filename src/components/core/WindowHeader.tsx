import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowHeaderProps {
  title?: string;
  isAlwaysOnTop?: boolean;
  onToggleAlwaysOnTop?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function WindowHeader({
  title = "Poe Ledger",
  isAlwaysOnTop = true,
  onToggleAlwaysOnTop,
  onMinimize,
  onClose,
}: WindowHeaderProps) {
  const [pinned, setPinned] = useState(isAlwaysOnTop);

  const handleTogglePin = async () => {
    try {
      const appWindow = getCurrentWindow();
      const nextPinState = !pinned;
      await appWindow.setAlwaysOnTop(nextPinState);
      setPinned(nextPinState);
      onToggleAlwaysOnTop?.();
    } catch {
      // Fallback if running outside Tauri webview
      setPinned(!pinned);
    }
  };

  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
      return;
    }
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch {
      // Browser fallback
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
      return;
    }
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch {
      // Browser fallback
    }
  };

  return (
    <header className="window-header" data-tauri-drag-region>
      <div className="header-left" data-tauri-drag-region>
        <span className="app-logo" data-tauri-drag-region>⚖️</span>
        <span className="app-title" data-tauri-drag-region>{title}</span>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className={`header-btn pin-btn ${pinned ? "active" : ""}`}
          onClick={handleTogglePin}
          title={pinned ? "Sempre no topo (Ativo)" : "Fixar no topo"}
          aria-label="Fixar janela no topo"
        >
          📌
        </button>
        <button
          type="button"
          className="header-btn"
          onClick={handleMinimize}
          title="Minimizar"
          aria-label="Minimizar janela"
        >
          −
        </button>
        <button
          type="button"
          className="header-btn close-btn"
          onClick={handleClose}
          title="Fechar"
          aria-label="Fechar janela"
        >
          ×
        </button>
      </div>
    </header>
  );
}
