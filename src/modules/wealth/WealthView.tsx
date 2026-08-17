import { useState, useMemo, useEffect, useCallback } from "react";
import { useSettings } from "../../stores/settingsStore";
import { useAuth } from "../../stores/authStore";
import { CharacterSelector } from "../../components/core/CharacterSelector";
import { MOCK_VALUED_ITEMS } from "./mockWealthData";
import { ValuedItem } from "../../types/item";
import { economyService } from "../../services/economy/economyService";

type FilterCategory = "all" | "equipment" | "currency" | "other";

const DIVINE_TO_CHAOS_RATIO = 150;

interface WealthViewProps {
  onNetWorthChange?: (totalText: string) => void;
}

export function WealthView({ onNetWorthChange }: WealthViewProps) {
  const [settings] = useSettings();
  const {
    selectedCharacter,
    combinedItems,
    loadItems,
    loadStashes,
    stashTabs,
    stashError,
    isAuthenticated,
    isLoading: isAuthLoading,
    isStashLoading,
  } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [items, setItems] = useState<ValuedItem[]>(MOCK_VALUED_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDivine = settings.wealth.defaultCurrency === "divine";

  // Re-valuate items whenever combined items (character + stashes) change
  const valuateCurrentItems = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      if (combinedItems && combinedItems.length > 0) {
        const result = await economyService.valuateItems(combinedItems, "Standard");
        setItems(result.valuedItems);
      } else if (!isAuthenticated) {
        setItems(MOCK_VALUED_ITEMS);
      } else {
        setItems([]);
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Não foi possível avaliar os preços.");
    } finally {
      setIsRefreshing(false);
    }
  }, [combinedItems, isAuthenticated]);

  useEffect(() => {
    valuateCurrentItems();
  }, [valuateCurrentItems]);

  const handleRefresh = async () => {
    if (selectedCharacter) {
      await loadItems(selectedCharacter);
    }
    await loadStashes();
    await valuateCurrentItems();
  };

  // Calculate total net worth
  const totalNetWorth = useMemo(() => {
    const totalDiv = items.reduce((acc, it) => {
      const valInDiv = it.currency === "divine" ? it.totalPrice : it.totalPrice / DIVINE_TO_CHAOS_RATIO;
      return acc + valInDiv;
    }, 0);

    return isDivine ? totalDiv : totalDiv * DIVINE_TO_CHAOS_RATIO;
  }, [items, isDivine]);

  const formatPrice = (val: number) => {
    if (val >= 100) return val.toFixed(1);
    if (val >= 1) return val.toFixed(2);
    return val.toFixed(3);
  };

  useEffect(() => {
    const summaryText = `${formatPrice(totalNetWorth)} ${isDivine ? "div" : "c"}`;
    onNetWorthChange?.(summaryText);
  }, [totalNetWorth, isDivine, onNetWorthChange]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        // Category filter
        if (selectedCategory === "equipment" && it.item.category !== "equipment") return false;
        if (selectedCategory === "currency" && it.item.category !== "currency") return false;
        if (selectedCategory === "other" && (it.item.category === "equipment" || it.item.category === "currency")) return false;

        // Min value filter (in Divine)
        const valueInDiv = it.currency === "divine" ? it.totalPrice : it.totalPrice / DIVINE_TO_CHAOS_RATIO;
        if (valueInDiv < settings.wealth.minItemValue) return false;

        return true;
      })
      .sort((a, b) => {
        const valA = a.currency === "divine" ? a.totalPrice : a.totalPrice / DIVINE_TO_CHAOS_RATIO;
        const valB = b.currency === "divine" ? b.totalPrice : b.totalPrice / DIVINE_TO_CHAOS_RATIO;
        return valB - valA;
      })
      .slice(0, settings.wealth.maxDisplayedItems);
  }, [items, selectedCategory, settings.wealth.minItemValue, settings.wealth.maxDisplayedItems]);

  return (
    <div className="module-view wealth-view">
      {/* Character Selector Bar */}
      <CharacterSelector />

      {/* Stash Notice Banner if POESESSID is missing */}
      {isAuthenticated && stashError && (
        <div className="stash-notice-banner">
          <span className="stash-icon">📦</span>
          <span className="stash-text">
            Para somar suas <strong>Abas do Baú (Stashes)</strong>, insira seu <strong>POESESSID</strong> nas Configurações (⚙️).
          </span>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="error-alert-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{errorMessage}</span>
          <button className="error-retry-btn" onClick={handleRefresh}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Header Summary */}
      <div className="wealth-header-summary">
        <div className="summary-left">
          <div className="summary-label-row">
            <span className="summary-label">Patrimônio Líquido</span>
            {stashTabs.length > 0 && (
              <span className="stash-active-badge" title={`${stashTabs.length} abas de baú carregadas`}>
                📦 {stashTabs.length} abas
              </span>
            )}
          </div>
          <div className="total-display">
            <span className="total-value">{formatPrice(totalNetWorth)}</span>
            <span className={`currency-badge ${isDivine ? "divine" : "chaos"}`}>
              {isDivine ? "DIV" : "CHAOS"}
            </span>
          </div>
        </div>
        <div className="summary-actions">
          <button
            className={`icon-btn refresh-btn ${isRefreshing || isAuthLoading || isStashLoading ? "spin" : ""}`}
            onClick={handleRefresh}
            title="Atualizar dados de preços, baú e inventário"
            aria-label="Atualizar dados"
            disabled={isRefreshing || isAuthLoading || isStashLoading}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="wealth-filter-bar">
        <button
          className={`filter-pill ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          Todos
        </button>
        <button
          className={`filter-pill ${selectedCategory === "equipment" ? "active" : ""}`}
          onClick={() => setSelectedCategory("equipment")}
        >
          Equipamentos
        </button>
        <button
          className={`filter-pill ${selectedCategory === "currency" ? "active" : ""}`}
          onClick={() => setSelectedCategory("currency")}
        >
          Currency
        </button>
        <button
          className={`filter-pill ${selectedCategory === "other" ? "active" : ""}`}
          onClick={() => setSelectedCategory("other")}
        >
          Cartas / Gems
        </button>
      </div>

      {/* Items List */}
      <div className="items-list-container">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <p className="empty-title">Nenhum item avaliado</p>
            <p className="empty-desc">
              {isAuthenticated
                ? "Nenhum item atingiu o valor mínimo configurado ou adicione seu POESESSID em ⚙️ para ler seu baú."
                : "Conecte sua conta do PoE acima para visualizar seus itens reais."}
            </p>
          </div>
        ) : (
          <div className="items-scroll-list">
            {filteredItems.map((vItem) => {
              const itemVal = isDivine
                ? (vItem.currency === "divine" ? vItem.totalPrice : vItem.totalPrice / DIVINE_TO_CHAOS_RATIO)
                : (vItem.currency === "chaos" ? vItem.totalPrice : vItem.totalPrice * DIVINE_TO_CHAOS_RATIO);

              const stack = vItem.item.stackSize && vItem.item.stackSize > 1 ? ` ×${vItem.item.stackSize}` : "";

              return (
                <div key={vItem.item.id} className={`item-row rarity-${vItem.item.rarity}`}>
                  <div className="item-left">
                    {vItem.item.icon ? (
                      <div className="item-icon-wrapper">
                        <img
                          src={vItem.item.icon}
                          alt={vItem.item.name || vItem.item.typeLine}
                          className="item-icon"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="item-icon-fallback">📦</div>
                    )}
                    <div className="item-details">
                      <span className="item-title">
                        {vItem.item.name || vItem.item.typeLine}
                        {stack && <span className="stack-badge">{stack}</span>}
                      </span>
                      {vItem.item.name && vItem.item.typeLine && (
                        <span className="item-base">{vItem.item.typeLine}</span>
                      )}
                    </div>
                  </div>

                  <div className="item-price-wrapper">
                    <span className="item-total-price">
                      {formatPrice(itemVal)}
                    </span>
                    <span className={`item-currency-label ${isDivine ? "div" : "c"}`}>
                      {isDivine ? "div" : "c"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="wealth-footer">
        <span className="items-count">
          {filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"} listados
        </span>
        <span className="valuation-currency">
          Mín: {settings.wealth.minItemValue} div
        </span>
      </div>
    </div>
  );
}

export default WealthView;
