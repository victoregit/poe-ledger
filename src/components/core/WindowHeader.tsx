import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../../services/http/isTauri";

interface WindowHeaderProps {
  title?: string;
  isAlwaysOnTop?: boolean;
  isCompact?: boolean;
  compactSummary?: string;
  onToggleAlwaysOnTop?: () => void;
  onToggleCompact?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function WindowHeader({
  title = "Poe Ledger",
  isAlwaysOnTop = true,
  isCompact = false,
  compactSummary,
  onToggleAlwaysOnTop,
  onToggleCompact,
  onMinimize,
  onClose,
}: WindowHeaderProps) {
  const [pinned, setPinned] = useState(isAlwaysOnTop);

  const handleTogglePin = async () => {
    try {
      if (isTauri()) {
        const appWindow = getCurrentWindow();
        const nextPinState = !pinned;
        await appWindow.setAlwaysOnTop(nextPinState);
      }
      setPinned(!pinned);
      onToggleAlwaysOnTop?.();
    } catch {
      setPinned(!pinned);
    }
  };

  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
      return;
    }
    if (isTauri()) {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.minimize();
      } catch {
        // Fallback
      }
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
      return;
    }
    if (isTauri()) {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.close();
      } catch {
        // Fallback
      }
    }
  };

  return (
    <header className={`window-header ${isCompact ? "compact-header" : ""}`} data-tauri-drag-region>
      <div className="header-left" data-tauri-drag-region>
        <span className="app-logo" data-tauri-drag-region>⚖️</span>
        {isCompact && compactSummary ? (
          <span className="compact-wealth-text" data-tauri-drag-region>
            {compactSummary}
          </span>
        ) : (
          <span className="app-title" data-tauri-drag-region>{title}</span>
        )}
      </div>

      <div className="header-actions">
        {onToggleCompact && (
          <button
            type="button"
            className="header-btn toggle-compact-btn"
            onClick={onToggleCompact}
            title={isCompact ? "Expandir janela" : "Modo Mini Player"}
            aria-label="Alternar modo mini player"
          >
            {isCompact ? "⤢" : "⤡"}
          </button>
        )}

        {!isCompact && (
          <button
            type="button"
            className={`header-btn pin-btn ${pinned ? "active" : ""}`}
            onClick={handleTogglePin}
            title={pinned ? "Sempre no topo (Ativo)" : "Fixar no topo"}
            aria-label="Fixar janela no topo"
          >
            📌
          </button>
        )}

        {!isCompact && (
          <button
            type="button"
            className="header-btn"
            onClick={handleMinimize}
            title="Minimizar para bandeja"
            aria-label="Minimizar janela"
          >
            −
          </button>
        )}

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

export default WindowHeader;
