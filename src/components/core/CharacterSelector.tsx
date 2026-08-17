import { useState } from "react";
import { useAuth } from "../../stores/authStore";

export function CharacterSelector() {
  const {
    accountName,
    isAuthenticated,
    characters,
    selectedCharacter,
    activeLeague,
    availableLeagues,
    selectCharacter,
    setLeague,
    connectAccount,
    logout,
    isLoading,
    error,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
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
    <div className="character-selector-wrapper">
      {/* Character & League Bar */}
      <div className="char-league-bar">
        {/* Character Button */}
        <div className="character-selector-container">
          <button
            type="button"
            className="character-active-btn"
            onClick={() => {
              setIsOpen(!isOpen);
              setIsLeagueOpen(false);
            }}
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
              </div>
            </div>
            <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
          </button>

          {/* Character Dropdown */}
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

        {/* League Selector Button */}
        <div className="league-selector-container">
          <button
            type="button"
            className="league-active-btn"
            onClick={() => {
              setIsLeagueOpen(!isLeagueOpen);
              setIsOpen(false);
            }}
            title="Clique para alternar a liga ativa"
          >
            <span className="league-icon">🏆</span>
            <span className="league-name">{activeLeague}</span>
            <span className="dropdown-arrow">{isLeagueOpen ? "▲" : "▼"}</span>
          </button>

          {/* League Dropdown */}
          {isLeagueOpen && (
            <div className="league-dropdown-menu">
              <div className="dropdown-header">
                <span className="account-title">Selecionar Liga</span>
              </div>
              <div className="dropdown-list">
                {availableLeagues.map((lg) => {
                  const isSelected = lg.toLowerCase() === activeLeague.toLowerCase();
                  return (
                    <button
                      key={lg}
                      type="button"
                      className={`league-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setLeague(lg);
                        setIsLeagueOpen(false);
                      }}
                    >
                      <span>{lg}</span>
                      {isSelected && <span className="league-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CharacterSelector;
