import { useState, useEffect } from "react";
import { useSettings } from "../../stores/settingsStore";
import { useAuth } from "../../stores/authStore";
import { gameWatcherService, GameStatus } from "../../services/game/gameWatcherService";

export function SettingsView() {
  const [settings, setSettings] = useSettings();
  const { accountName, connectAccount, loadStashes, logout, isLoading } = useAuth();
  const [accountInput, setAccountInput] = useState(accountName || "");
  const [poesessidInput, setPoesessidInput] = useState(settings.account.poesessid || "");
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

  const handleMinValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    setSettings((prev) => ({
      ...prev,
      wealth: { ...prev.wealth, minItemValue: val },
    }));
  };

  const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(5, parseInt(e.target.value, 10) || 10);
    setSettings((prev) => ({
      ...prev,
      wealth: { ...prev.wealth, maxDisplayedItems: val },
    }));
  };

  const handleToggleIncludeInventory = () => {
    setSettings((prev) => ({
      ...prev,
      wealth: { ...prev.wealth, includeInventory: !prev.wealth.includeInventory },
    }));
  };

  const handleToggleIncludeStash = () => {
    setSettings((prev) => ({
      ...prev,
      wealth: { ...prev.wealth, includeStash: !prev.wealth.includeStash },
    }));
  };

  const handleSaveAccount = async () => {
    if (!accountInput.trim()) return;
    setAccountFeedback(null);
    const success = await connectAccount(accountInput.trim());
    if (success) {
      setAccountFeedback("Conta conectada com sucesso!");
      setTimeout(() => setAccountFeedback(null), 3000);
    } else {
      setAccountFeedback("Falha ao conectar. Verifique se o nome está correto e público.");
    }
  };

  const handleSavePoesessid = () => {
    const clean = poesessidInput.trim();
    setSettings((prev) => ({
      ...prev,
      account: { ...prev.account, poesessid: clean ? clean : null },
    }));
    loadStashes();
    setAccountFeedback("POESESSID salvo! Atualizando baús...");
    setTimeout(() => setAccountFeedback(null), 3000);
  };

  const handleOpenGggLogin = () => {
    gameWatcherService.openInAppLogin();
  };

  return (
    <div className="module-view settings-view">
      {/* Game Client Status */}
      <div className="settings-section">
        <h3 className="section-title">Detecção do Jogo (Path of Exile)</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Status do Jogo</span>
            <span className="setting-subtext">
              {gameStatus.isLogDetected
                ? "Cliente do PoE localizado no disco"
                : "Arquivo de logs Client.txt não encontrado"}
            </span>
          </div>
          <span className={`status-pill ${gameStatus.isLogDetected ? "online" : "offline"}`}>
            {gameStatus.isLogDetected ? "Conectado" : "Não detectado"}
          </span>
        </div>

        {gameStatus.currentZone && (
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">Área / Zona Atual</span>
              <span className="setting-subtext">Localização do personagem no jogo</span>
            </div>
            <span className="zone-badge">📍 {gameStatus.currentZone}</span>
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div className="settings-section">
        <h3 className="section-title">Conta Path of Exile</h3>
        
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Nome da Conta</span>
            <span className="setting-subtext">Seu usuário público no PoE (ex: Nick#1234)</span>
          </div>
          <div className="setting-control account-connect-row">
            <input
              type="text"
              className="settings-text-input"
              placeholder="Ex: Liives#7290"
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
            />
            <button
              type="button"
              className="btn-submit"
              onClick={handleSaveAccount}
              disabled={isLoading || !accountInput.trim()}
            >
              {isLoading ? "..." : "Conectar"}
            </button>
            {accountName && (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  logout();
                  setAccountInput("");
                  setPoesessidInput("");
                }}
                title="Desconectar conta"
              >
                Sair
              </button>
            )}
          </div>
        </div>

        {/* In-App Login with GGG */}
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Login Oficial da GGG</span>
            <span className="setting-subtext">
              Abrir tela de login no site oficial da GGG
            </span>
          </div>
          <button
            type="button"
            className="btn-submit ggg-login-btn"
            onClick={handleOpenGggLogin}
          >
            🛡️ Abrir Login GGG
          </button>
        </div>

        {/* POESESSID Configuration */}
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">POESESSID (Abas do Baú / Stashes)</span>
            <span className="setting-subtext">
              Exigido pela GGG para leitura de abas privadas de baú.
            </span>
          </div>
          <div className="setting-control account-connect-row">
            <input
              type="password"
              className="settings-text-input"
              placeholder="Cole seu POESESSID"
              value={poesessidInput}
              onChange={(e) => setPoesessidInput(e.target.value)}
            />
            <button
              type="button"
              className="btn-submit"
              onClick={handleSavePoesessid}
            >
              Salvar
            </button>
          </div>
        </div>

        <p className="settings-tip">
          💡 <strong>Como pegar o POESESSID:</strong> Acesse pathofexile.com logado &gt; aperte F12 &gt; Application &gt; Cookies &gt; copie o valor do cookie <code>POESESSID</code>.
        </p>

        {accountFeedback && (
          <div className={`feedback-badge ${accountFeedback.includes("sucesso") || accountFeedback.includes("salvo") ? "success" : "error"}`}>
            {accountFeedback}
          </div>
        )}
      </div>

      {/* Sources selection */}
      <div className="settings-section">
        <h3 className="section-title">Fontes de Riqueza (Wealth)</h3>
        
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Inventário & Equipamentos do Personagem</span>
            <span className="setting-subtext">Incluir itens equipados no cálculo</span>
          </div>
          <button
            className={`toggle-option ${settings.wealth.includeInventory ? "active" : ""}`}
            onClick={handleToggleIncludeInventory}
          >
            {settings.wealth.includeInventory ? "Ligado" : "Desligado"}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Abas do Baú (Stash Tabs)</span>
            <span className="setting-subtext">Incluir abas de baú no cálculo</span>
          </div>
          <button
            className={`toggle-option ${settings.wealth.includeStash ? "active" : ""}`}
            onClick={handleToggleIncludeStash}
          >
            {settings.wealth.includeStash ? "Ligado" : "Desligado"}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Overlay & Interface</h3>
        
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Opacidade</span>
            <span className="setting-subtext">Transparência da janela</span>
          </div>
          <div className="setting-control range-control">
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={settings.overlay.opacity}
              onChange={handleOpacityChange}
            />
            <span className="range-val">{Math.round(settings.overlay.opacity * 100)}%</span>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Escala da Interface</span>
            <span className="setting-subtext">Tamanho dos elementos</span>
          </div>
          <div className="setting-control range-control">
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={settings.overlay.scale}
              onChange={handleScaleChange}
            />
            <span className="range-val">{Math.round(settings.overlay.scale * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Parâmetros de Preço</h3>
        
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Moeda Padrão</span>
            <span className="setting-subtext">Conversão primária de patrimônio</span>
          </div>
          <div className="setting-control btn-group">
            <button
              className={`toggle-option ${settings.wealth.defaultCurrency === "divine" ? "active" : ""}`}
              onClick={() => handleCurrencyChange("divine")}
            >
              Divine
            </button>
            <button
              className={`toggle-option ${settings.wealth.defaultCurrency === "chaos" ? "active" : ""}`}
              onClick={() => handleCurrencyChange("chaos")}
            >
              Chaos
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Valor Mínimo do Item</span>
            <span className="setting-subtext">Itens abaixo deste valor são ocultados</span>
          </div>
          <div className="setting-control number-control">
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.wealth.minItemValue}
              onChange={handleMinValueChange}
            />
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Máximo de Itens Exibidos</span>
            <span className="setting-subtext">Limite de linhas na tabela</span>
          </div>
          <div className="setting-control number-control">
            <input
              type="number"
              min="5"
              max="100"
              step="5"
              value={settings.wealth.maxDisplayedItems}
              onChange={handleMaxItemsChange}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Atalhos Globais (Hotkeys)</h3>
        
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Exibir / Ocultar Overlay</span>
          </div>
          <span className="keycap">{settings.hotkeys.toggleOverlay}</span>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Atualizar Wealth</span>
          </div>
          <span className="keycap">{settings.hotkeys.refreshWealth}</span>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
