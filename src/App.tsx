import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { useAuth } from "./stores/authStore";
import { useSettings } from "./stores/settingsStore";
import { gameWatcherService, GameStatus } from "./services/game/gameWatcherService";
import { hotkeyService } from "./services/hotkeys/hotkeyService";
import { CharacterLoadout } from "./modules/wealth/CharacterLoadout";
import { SettingsView } from "./modules/settings/SettingsView";
import { EconomyView } from "./modules/economy/EconomyView";
import { isTauri } from "./services/http/isTauri";

export function App() {
  const {
    accountName,
    selectedCharacter,
    activeLeague,
    availableLeagues,
    leagueCharacters,
    characterItems,
    selectCharacter,
    setLeague,
    loadItems,
  } = useAuth();
  const [settings, setSettings] = useSettings();
  const [gameStatus, setGameStatus] = useState<GameStatus>(() => gameWatcherService.getStatus());
  const [showSettings, setShowSettings] = useState(false);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    return gameWatcherService.subscribe((st) => {
      setGameStatus(st);
    });
  }, []);

  useEffect(() => {
    // Setup hotkeys (don't await, just fire and forget)
    hotkeyService.setupGlobalHotkeys(settings.hotkeys, {
      onToggleOverlay: () => console.log("Overlay toggled"),
      onRefreshWealth: () => {
        setIsRefreshing(true);
        if (selectedCharacter) {
          loadItems(selectedCharacter).finally(() => {
            setTimeout(() => setIsRefreshing(false), 1000);
          });
        } else {
          setTimeout(() => setIsRefreshing(false), 1000);
        }
      },
      onToggleCompact: () => setShowSettings((prev) => !prev),
    }).catch(() => {
      // Silently catch any errors from hotkey setup
    });

    return () => {
      hotkeyService.cleanup().catch(() => {
        // Silently ignore cleanup errors
      });
    };
  }, [settings.hotkeys, selectedCharacter, loadItems]);

  const handleTogglePin = () => {
    setSettings((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, alwaysOnTop: !prev.overlay.alwaysOnTop },
    }));
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (selectedCharacter) {
      await loadItems(selectedCharacter);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleMinimize = async () => {
    if (isTauri()) {
      await getCurrentWindow().minimize();
    }
  };

  const handleClose = async () => {
    if (isTauri()) {
      await getCurrentWindow().close();
    }
  };

  useEffect(() => {
    if (!isTauri()) return;

    const height = accountName && showInventory ? 760 : (showSettings || showEconomy ? 580 : 350);
    getCurrentWindow().setSize(new LogicalSize(window.innerWidth, height)).catch(() => {
      // Keep the current window size if resizing is not available.
    });
  }, [showSettings, showEconomy, accountName, showInventory]);

  if (showSettings) {
    return (
      <main className="overlay-wrapper">
        <div
          className="window-header"
          data-tauri-drag-region
          style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(100, 150, 255, 0.2)",
          minHeight: "36px",
          }}
        >
          <span data-tauri-drag-region style={{ fontSize: "13px", fontWeight: 600, color: "#6495f7" }}>⚙️ Configurações</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className="topbar-button"
              onClick={() => setShowSettings(false)}
              title="Voltar"
              aria-label="Voltar"
              style={{
                background: "none",
                border: "none",
                color: "#e8e8e8",
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px",
              }}
            >
              ←
            </button>
            <button
              className="topbar-button"
              onClick={handleMinimize}
              title="Minimizar"
              aria-label="Minimizar"
              style={{
                background: "none",
                border: "none",
                color: "#6495f7",
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px",
              }}
            >
              −
            </button>
            <button
              className="topbar-button topbar-close-button"
              onClick={handleClose}
              title="Fechar aplicativo"
              aria-label="Fechar aplicativo"
              style={{
                background: "none",
                border: "none",
                color: "#fb7185",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0 4px",
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SettingsView />
        </div>
      </main>
    );
  }

  if (showEconomy) {
    return (
      <main className="overlay-wrapper">
        <div className="window-header" data-tauri-drag-region style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid rgba(100, 150, 255, 0.2)", minHeight: "36px" }}>
          <span data-tauri-drag-region style={{ fontSize: "13px", fontWeight: 600, color: "#6495f7" }}>📈 Economia</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button className="topbar-button" onClick={() => setShowEconomy(false)} title="Voltar" aria-label="Voltar" style={{ background: "none", border: "none", color: "#e8e8e8", cursor: "pointer" }}>←</button>
            <button className="topbar-button" onClick={handleMinimize} title="Minimizar" aria-label="Minimizar" style={{ background: "none", border: "none", color: "#6495f7", cursor: "pointer" }}>−</button>
            <button className="topbar-button topbar-close-button" onClick={handleClose} title="Fechar aplicativo" aria-label="Fechar aplicativo" style={{ background: "none", border: "none", color: "#fb7185", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
        </div>
        <EconomyView />
      </main>
    );
  }

  return (
    <main className="overlay-wrapper">
      {/* Header */}
      <div
        className="window-header"
        data-tauri-drag-region
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(100, 150, 255, 0.2)",
          minHeight: "36px",
        }}
      >
        <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <span data-tauri-drag-region style={{ fontSize: "12px", color: "#aaa", whiteSpace: "nowrap" }}>POE LEDGER</span>
          {accountName && (
            <span data-tauri-drag-region style={{ fontSize: "11px", color: "#6495f7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {accountName}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            className="topbar-button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Atualizar dados"
            style={{
              background: "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: "#6495f7",
              cursor: isRefreshing ? "wait" : "pointer",
              padding: "4px 6px",
              borderRadius: "3px",
              fontSize: "11px",
              fontWeight: 600,
              opacity: isRefreshing ? 0.6 : 1,
            }}
          >
            ↻
          </button>
          <button
            className="topbar-button"
            onClick={handleTogglePin}
            title={settings.overlay.alwaysOnTop ? "Desafixar" : "Afixar"}
            style={{
              background: settings.overlay.alwaysOnTop ? "rgba(100, 200, 100, 0.2)" : "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: settings.overlay.alwaysOnTop ? "#6bc76b" : "#6495f7",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "3px",
              fontSize: "12px",
            }}
          >
            📌
          </button>
          <button
            className="topbar-button"
            onClick={() => setShowSettings(true)}
            title="Configurações"
            style={{
              background: "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: "#6495f7",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "3px",
              fontSize: "12px",
            }}
          >
            ⚙️
          </button>
          <button
            className="topbar-button"
            onClick={handleMinimize}
            title="Minimizar"
            aria-label="Minimizar"
            style={{
              background: "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: "#6495f7",
              cursor: "pointer",
              padding: "4px 7px",
              borderRadius: "3px",
              fontSize: "12px",
            }}
          >
            −
          </button>
          <button
            className="topbar-button topbar-close-button"
            onClick={handleClose}
            title="Fechar aplicativo"
            aria-label="Fechar aplicativo"
            style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fb7185",
              cursor: "pointer",
              padding: "4px 7px",
              borderRadius: "3px",
              fontSize: "12px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Status Line */}
      <div
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          color: "#aaa",
          borderBottom: "1px solid rgba(100, 150, 255, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {selectedCharacter && <span>{selectedCharacter}</span>}
          {!selectedCharacter && accountName && <span>Conectada</span>}
          {!accountName && <span>Conta não conectada</span>}
        </div>
        {gameStatus.isLogDetected && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#6bc76b", fontSize: "10px" }}>● Jogo Ativo</span>
            {gameStatus.currentZone && <span style={{ color: "#888", fontSize: "10px" }}>{gameStatus.currentZone}</span>}
          </div>
        )}
      </div>

      {accountName && (
        <section className="character-selectors" aria-label="Seleção de personagem e liga">
          <label>
            <span>Liga</span>
            <select value={activeLeague} onChange={(event) => setLeague(event.target.value)}>
              {availableLeagues.map((league) => <option key={league} value={league}>{league}</option>)}
            </select>
          </label>
          <label>
            <span>Personagem</span>
            <select value={selectedCharacter ?? ""} onChange={(event) => selectCharacter(event.target.value)} disabled={leagueCharacters.length === 0}>
              {leagueCharacters.length === 0 && <option value="">Nenhum personagem nesta liga</option>}
              {leagueCharacters.map((character) => <option key={character.name} value={character.name}>{character.name} · Nv. {character.level}</option>)}
            </select>
          </label>
        </section>
      )}

      {accountName && (
        <section className="character-home-card">
          <div className="character-home-icon">🧙</div>
          <div className="character-home-info">
            <strong>{selectedCharacter || "Nenhum personagem selecionado"}</strong>
            <span>{activeLeague} · {characterItems.length} itens carregados</span>
            <small>Exibe somente inventário e equipamentos do personagem. Baús não estão incluídos.</small>
          </div>
          <div className="character-home-actions">
            <button className="character-economy-button" onClick={() => setShowEconomy(true)}>📈 Economia</button>
            <button onClick={() => setShowInventory((visible) => !visible)}>
              {showInventory ? "Ocultar" : "Ver loadout"}
            </button>
          </div>
        </section>
      )}

      {/* Character inventory only — stash data is intentionally not implied here. */}
      {accountName && showInventory && (
        <div style={{ padding: "12px" }}>
          <CharacterLoadout items={characterItems} />
        </div>
      )}

      {/* No Account Message */}
      {!accountName && (
        <div className="welcome-panel">
          <span className="welcome-icon">⚖️</span>
          <div>
            <strong>Comece conectando sua conta</strong>
            <p>Use o nome público da sua conta do Path of Exile para carregar seus personagens e itens reais.</p>
          </div>
          <button onClick={() => setShowSettings(true)}>Conectar conta</button>
          <button className="welcome-economy-button" onClick={() => setShowEconomy(true)}>Ver economia</button>
        </div>
      )}
    </main>
  );
}

export default App;
