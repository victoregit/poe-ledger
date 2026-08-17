import { useState } from "react";
import { useAuth } from "../../stores/authStore";

export function CharacterSelector() {
  const {
    accountName,
    isAuthenticated,
    characters,
    selectedCharacter,
    selectCharacter,
    connectAccount,
    logout,
    isLoading,
    error,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(!isAuthenticated);
  const [inputAccount, setInputAccount] = useState(accountName || "");

  const activeChar = characters.find((c) => c.name === selectedCharacter);

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAccount.trim()) return;
    const success = await connectAccount(inputAccount.trim());
    if (success) {
      setIsEditingAccount(false);
    }
  };

  if (!isAuthenticated || isEditingAccount) {
    return (
      <div className="account-connect-card">
        <div className="connect-header">
          <span className="connect-icon">🛡️</span>
          <span className="connect-title">Conectar Conta Path of Exile</span>
        </div>
        <p className="connect-help">
          Informe o nome da sua conta pública do PoE para carregar seus personagens e itens.
        </p>

        <form onSubmit={handleSubmitAccount} className="connect-form">
          <input
            type="text"
            className="account-input"
            placeholder="Ex: SeuUsuario ou SeuNick#1234"
            value={inputAccount}
            onChange={(e) => setInputAccount(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <div className="form-actions">
            {isAuthenticated && (
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsEditingAccount(false)}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading || !inputAccount.trim()}
            >
              {isLoading ? "Conectando..." : "Conectar Conta"}
            </button>
          </div>
        </form>

        {error && <div className="connect-error-msg">{error}</div>}
      </div>
    );
  }

  return (
    <div className="character-selector-container">
      <button
        type="button"
        className="character-active-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Clique para alternar personagem ou conta"
      >
        <div className="char-badge-icon">🧙</div>
        <div className="char-info-text">
          <div className="char-primary-row">
            <span className="char-name">{activeChar?.name || "Selecionar Personagem"}</span>
            {activeChar && (
              <span className="char-level-badge">Nv. {activeChar.level}</span>
            )}
          </div>
          <div className="char-sub-row">
            <span className="char-class">{activeChar?.class || "Classe"}</span>
            <span className="char-separator">•</span>
            <span className="char-league">{activeChar?.league || "League"}</span>
          </div>
        </div>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="character-dropdown-menu">
          <div className="dropdown-header">
            <span className="account-title">Conta: {accountName}</span>
            <div className="dropdown-header-actions">
              <button
                type="button"
                className="switch-account-btn"
                onClick={() => {
                  setIsEditingAccount(true);
                  setIsOpen(false);
                }}
                title="Trocar de conta"
              >
                Trocar
              </button>
              <button
                type="button"
                className="logout-mini-btn"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                title="Desconectar conta"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="dropdown-list">
            {isLoading ? (
              <div className="dropdown-loading">Carregando personagens...</div>
            ) : characters.length === 0 ? (
              <div className="dropdown-empty">Nenhum personagem encontrado.</div>
            ) : (
              characters.map((c) => {
                const isSelected = c.name === selectedCharacter;
                return (
                  <button
                    key={c.name}
                    type="button"
                    className={`character-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      selectCharacter(c.name);
                      setIsOpen(false);
                    }}
                  >
                    <div className="item-char-left">
                      <span className="item-char-name">{c.name}</span>
                      <span className="item-char-meta">
                        {c.class} • {c.league}
                      </span>
                    </div>
                    <span className="item-char-level">Nv. {c.level}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterSelector;
