import { useState, useEffect } from "react";
import { useSettings } from "../../stores/settingsStore";
import { useAuth } from "../../stores/authStore";
import { gameWatcherService, GameStatus } from "../../services/game/gameWatcherService";

export function SettingsView() {
  const [settings, setSettings] = useSettings();
  const { accountName, connectAccount, logout, isLoading, error } = useAuth();
  const [accountInput, setAccountInput] = useState(accountName || "");
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(() => gameWatcherService.getStatus());

  useEffect(() => {
    return gameWatcherService.subscribe((st) => {
      setGameStatus(st);
    });
  }, []);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSettings((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, opacity: val },
    }));
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSettings((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, scale: val },
    }));
  };

  const handleCurrencyChange = (currency: "divine" | "chaos") => {
    setSettings((prev) => ({
      ...prev,
      wealth: { ...prev.wealth, defaultCurrency: currency },
    }));
  };

  const handleSaveAccount = async () => {
    if (!accountInput.trim()) return;
    setAccountFeedback(null);
    const success = await connectAccount(accountInput.trim());
    if (success) {
      setAccountFeedback("✅ Conta conectada com sucesso!");
      setTimeout(() => setAccountFeedback(null), 3000);
    } else {
      setAccountFeedback(`❌ ${error || "Falha ao conectar. Verifique se o nome está correto e público."}`);
    }
  };

  return (
    <div className="module-view settings-view" style={{ padding: "12px" }}>
      {/* Account Settings */}
      <div className="settings-section" style={{ marginBottom: "16px" }}>
        <h3 className="section-title" style={{ fontSize: "12px", marginBottom: "8px" }}>Conta</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="text"
            className="settings-text-input"
            placeholder="Nome da conta (ex: Liives#7290)"
            value={accountInput}
            onChange={(e) => setAccountInput(e.target.value)}
            style={{ fontSize: "11px", padding: "6px" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="btn-submit"
              onClick={handleSaveAccount}
              disabled={isLoading || !accountInput.trim()}
              style={{ flex: 1, fontSize: "11px", padding: "6px" }}
            >
              {isLoading ? "..." : "Conectar"}
            </button>
            {accountName && (
              <button
                className="btn-cancel"
                onClick={() => {
                  logout();
                  setAccountInput("");
                }}
                style={{ fontSize: "11px", padding: "6px 8px" }}
              >
                Sair
              </button>
            )}
          </div>
        </div>

        {accountFeedback && (
          <div
            style={{
              fontSize: "10px",
              marginTop: "6px",
              padding: "6px",
              borderRadius: "3px",
              backgroundColor: accountFeedback.startsWith("✅") ? "rgba(100, 200, 100, 0.2)" : "rgba(255, 100, 100, 0.2)",
              color: accountFeedback.startsWith("✅") ? "#6bc76b" : "#ff6b6b",
            }}
          >
            {accountFeedback}
          </div>
        )}
      </div>

      {/* Game Status */}
      {gameStatus.isLogDetected && (
        <div className="settings-section" style={{ marginBottom: "16px" }}>
          <h3 className="section-title" style={{ fontSize: "12px", marginBottom: "8px" }}>Jogo</h3>
          <div style={{ fontSize: "11px", color: "#6bc76b" }}>✓ PoE Detectado</div>
          {gameStatus.currentZone && (
            <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>📍 {gameStatus.currentZone}</div>
          )}
        </div>
      )}

      {/* Overlay Settings */}
      <div className="settings-section" style={{ marginBottom: "16px" }}>
        <h3 className="section-title" style={{ fontSize: "12px", marginBottom: "8px" }}>Overlay</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "10px", color: "#aaa", display: "block", marginBottom: "4px" }}>Opacidade</label>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.1"
              value={settings.overlay.opacity}
              onChange={handleOpacityChange}
              style={{ width: "100%", height: "4px" }}
            />
            <span style={{ fontSize: "10px", color: "#888" }}>{Math.round(settings.overlay.opacity * 100)}%</span>
          </div>

          <div>
            <label style={{ fontSize: "10px", color: "#aaa", display: "block", marginBottom: "4px" }}>Escala</label>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={settings.overlay.scale}
              onChange={handleScaleChange}
              style={{ width: "100%", height: "4px" }}
            />
            <span style={{ fontSize: "10px", color: "#888" }}>{Math.round(settings.overlay.scale * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Pricing Settings */}
      <div className="settings-section">
        <h3 className="section-title" style={{ fontSize: "12px", marginBottom: "8px" }}>Moeda Padrão</h3>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`toggle-option ${settings.wealth.defaultCurrency === "divine" ? "active" : ""}`}
            onClick={() => handleCurrencyChange("divine")}
            style={{
              flex: 1,
              fontSize: "11px",
              padding: "6px",
              borderRadius: "3px",
              backgroundColor: settings.wealth.defaultCurrency === "divine" ? "rgba(100, 150, 255, 0.3)" : "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: "#6495f7",
              cursor: "pointer",
            }}
          >
            Divine
          </button>
          <button
            className={`toggle-option ${settings.wealth.defaultCurrency === "chaos" ? "active" : ""}`}
            onClick={() => handleCurrencyChange("chaos")}
            style={{
              flex: 1,
              fontSize: "11px",
              padding: "6px",
              borderRadius: "3px",
              backgroundColor: settings.wealth.defaultCurrency === "chaos" ? "rgba(100, 150, 255, 0.3)" : "rgba(100, 150, 255, 0.15)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              color: "#6495f7",
              cursor: "pointer",
            }}
          >
            Chaos
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
