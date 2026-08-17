import { useState } from "react";
import { useAuth } from "../../stores/authStore";

export function CharacterSelector() {
  const {
    isAuthenticated,
    accountName,
    characters,
    selectedCharacter,
    selectCharacter,
    loginWithMock,
    logout,
    isLoading,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const activeChar = characters.find((c) => c.name === selectedCharacter);

  if (!isAuthenticated) {
    return (
      <div className="auth-prompt-bar">
        <div className="auth-prompt-left">
          <span className="auth-icon">🛡️</span>
          <span className="auth-text">Conecte sua conta oficial PoE</span>
        </div>
        <button
          type="button"
          className="auth-btn login-btn"
          onClick={() => loginWithMock("ExileTrader#1337")}
        >
          Autenticar GGG
        </button>
      </div>
    );
  }

  return (
    <div className="character-selector-container">
      <button
        type="button"
        className="character-active-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Clique para alternar personagem"
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
