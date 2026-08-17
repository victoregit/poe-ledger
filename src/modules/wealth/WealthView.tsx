import { useState, useMemo } from "react";
import { useSettings } from "../../stores/settingsStore";
import { MOCK_VALUED_ITEMS } from "./mockWealthData";
import { ValuedItem } from "../../types/item";

type FilterCategory = "all" | "equipment" | "currency" | "other";

const DIVINE_TO_CHAOS_RATIO = 150;

export function WealthView() {
  const [settings] = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [items, setItems] = useState<ValuedItem[]>(MOCK_VALUED_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate real-time price fluctuation slightly on mock data
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          lastUpdated: Date.now(),
        }))
      );
      setIsRefreshing(false);
    }, 600);
  };

  const isDivine = settings.wealth.defaultCurrency === "divine";

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

  return (
    <div className="module-view wealth-view">
      {/* Header Summary */}
      <div className="wealth-header-summary">
        <div className="summary-left">
          <span className="summary-label">Patrimônio Líquido</span>
          <div className="total-display">
            <span className="total-value">{formatPrice(totalNetWorth)}</span>
            <span className={`currency-badge ${isDivine ? "divine" : "chaos"}`}>
              {isDivine ? "DIV" : "CHAOS"}
            </span>
          </div>
        </div>
        <div className="summary-actions">
          <button
            className={`icon-btn refresh-btn ${isRefreshing ? "spin" : ""}`}
            onClick={handleRefresh}
            title="Atualizar dados de preços"
            aria-label="Atualizar dados"
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
            <p className="empty-title">Nenhum item encontrado</p>
            <p className="empty-desc">
              Tente ajustar os filtros ou o valor mínimo nas configurações.
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
