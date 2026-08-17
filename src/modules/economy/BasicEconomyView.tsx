import { useEffect, useState } from "react";
import { BasicEconomySnapshot, poeNinjaEconomyService } from "../../services/economy/poeNinjaEconomyService";

interface BasicEconomyViewProps {
  league?: string;
}

function formatValue(value: number | null, suffix: string): string {
  if (value === null) return "—";
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(2)} ${suffix}`;
}

export function BasicEconomyView({ league = "Allflame" }: BasicEconomyViewProps) {
  const [snapshot, setSnapshot] = useState<BasicEconomySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEconomy = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      setSnapshot(await poeNinjaEconomyService.getBasicEconomy(league, forceRefresh));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar a economia.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEconomy();
  }, [league]);

  return (
    <section className="basic-economy" aria-label="Economia do jogo">
      <div className="basic-economy-header">
        <div>
          <span className="basic-economy-title">📈 Economia do jogo</span>
          <span className="basic-economy-league">Liga {league} · poe.ninja</span>
        </div>
        <button className="icon-btn" onClick={() => void loadEconomy(true)} disabled={isLoading} title="Atualizar economia" aria-label="Atualizar economia">
          ↻
        </button>
      </div>

      {error && <p className="basic-economy-error">{error}</p>}
      {isLoading && !snapshot && <p className="basic-economy-state">Carregando valores de mercado…</p>}

      {snapshot && (
        <div className="basic-economy-columns">
          <div className="basic-economy-column">
            <span className="basic-economy-label">Moedas em destaque</span>
            {snapshot.currencies.map((currency) => (
              <div className="basic-economy-row" key={currency.name}>
                <span>{currency.name}</span>
                <strong>{formatValue(currency.chaosValue, "c")}</strong>
              </div>
            ))}
          </div>
          <div className="basic-economy-column">
            <span className="basic-economy-label">Únicos valiosos</span>
            {snapshot.uniqueArmours.map((item) => (
              <div className="basic-economy-row" key={`${item.name}-${item.baseType}`}>
                <span title={item.baseType}>{item.name}</span>
                <strong>{formatValue(item.divineValue, "div")}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
