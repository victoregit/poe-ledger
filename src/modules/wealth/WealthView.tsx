import { useSettings } from "../../stores/settingsStore";

export function WealthView() {
  const [settings] = useSettings();

  return (
    <div className="module-view wealth-view">
      <div className="wealth-header-summary">
        <div className="summary-left">
          <span className="summary-label">Patrimônio Líquido</span>
          <div className="total-display">
            <span className="total-value">0.00</span>
            <span className="currency-badge divine">
              {settings.wealth.defaultCurrency.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="summary-actions">
          <button className="icon-btn refresh-btn" title="Atualizar dados">
            ↻
          </button>
        </div>
      </div>

      <div className="wealth-filter-bar">
        <button className="filter-pill active">Todos</button>
        <button className="filter-pill">Equipamentos</button>
        <button className="filter-pill">Currency</button>
      </div>

      <div className="items-list-container">
        <div className="empty-state">
          <span className="empty-icon">🪙</span>
          <p className="empty-title">Nenhum item carregado</p>
          <p className="empty-desc">
            Autentique sua conta e selecione um personagem para calcular o patrimônio.
          </p>
        </div>
      </div>

      <div className="wealth-footer">
        <span className="items-count">0 itens</span>
        <span className="valuation-currency">Moeda: {settings.wealth.defaultCurrency}</span>
      </div>
    </div>
  );
}

export default WealthView;
