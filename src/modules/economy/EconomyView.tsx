import { useEffect, useRef, useState } from "react";
import {
  EconomyCategory,
  EconomyMarketEntry,
  poeNinjaEconomyService,
} from "../../services/economy/poeNinjaEconomyService";

type ItemFilter = "all" | "Amulet" | "Belt" | "Body Armour" | "Boots" | "Flask" | "Gloves" | "Helmet" | "Jewel" | "Quiver" | "Ring" | "Shield" | "Tincture" | "Weapon";
type CurrencyCategory = Extract<EconomyCategory, "currency" | "fragment" | "allflame_ember" | "omen" | "tattoo" | "runegraft" | "scarab" | "delirium_orb" | "fossil" | "resonator" | "essence" | "divination_card" | "artifact">;

const ITEM_FILTERS: ItemFilter[] = [
  "all", "Amulet", "Belt", "Body Armour", "Boots", "Flask", "Gloves", "Helmet", "Jewel", "Quiver", "Ring", "Shield", "Tincture", "Weapon",
];

const ALL_ITEM_SOURCES: Exclude<EconomyCategory, "currency">[] = ["unique_armour", "unique_weapon", "unique_accessory", "unique_flask", "unique_jewel"];
const CURRENCY_TABS: Array<{ id: CurrencyCategory; label: string }> = [
  { id: "currency", label: "Moedas" }, { id: "fragment", label: "Fragmentos" }, { id: "allflame_ember", label: "Embers" },
  { id: "omen", label: "Omens" }, { id: "tattoo", label: "Tattoos" }, { id: "runegraft", label: "Runegrafts" },
  { id: "scarab", label: "Scarabs" }, { id: "delirium_orb", label: "Delirium" }, { id: "fossil", label: "Fósseis" },
  { id: "resonator", label: "Resonators" }, { id: "essence", label: "Essences" }, { id: "divination_card", label: "Cartas" }, { id: "artifact", label: "Artefatos" },
];

function sourceForFilter(filter: ItemFilter): Exclude<EconomyCategory, "currency">[] {
  if (filter === "all") return ALL_ITEM_SOURCES;
  if (["Amulet", "Belt", "Ring"].includes(filter)) return ["unique_accessory"];
  if (["Body Armour", "Boots", "Gloves", "Helmet", "Shield"].includes(filter)) return ["unique_armour"];
  if (["Flask", "Tincture"].includes(filter)) return ["unique_flask"];
  if (filter === "Jewel") return ["unique_jewel"];
  return ["unique_weapon"];
}

function matchesFilter(item: EconomyMarketEntry, filter: ItemFilter): boolean {
  if (filter === "all") return true;
  const baseType = item.baseType.toLowerCase();
  if (filter === "Weapon") return !baseType.includes("quiver");
  return baseType.includes(filter.toLowerCase());
}

function formatValue(value: number | null, suffix: string) {
  if (value === null) return "—";
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(2)} ${suffix}`;
}

function MarketTooltip({ item, pinned = false, onUnpin }: { item: EconomyMarketEntry; pinned?: boolean; onUnpin?: () => void }) {
  const hasModifiers = item.implicitModifiers.length > 0 || item.explicitModifiers.length > 0;

  return (
    <aside className={`economy-tooltip ${pinned ? "economy-tooltip-pinned" : ""}`} role="tooltip">
      <div className="economy-tooltip-head">
        {item.icon && <img src={item.icon} alt="" />}
        <div>
          <strong className="economy-tooltip-title">{item.name}</strong>
          {item.baseType && <span className="economy-tooltip-base">{item.baseType}</span>}
        </div>
        {pinned && <button onClick={onUnpin} title="Desafixar item">×</button>}
      </div>
      {(item.levelRequired || item.itemLevel || item.quality || item.links || item.variant || item.corrupted) && (
        <span className="economy-tooltip-meta">
          {[
            item.levelRequired ? `Nível ${item.levelRequired}` : "",
            item.itemLevel ? `Item nível ${item.itemLevel}` : "",
            item.quality ? `Qualidade +${item.quality}%` : "",
            item.links ? `${item.links} links` : "",
            item.corrupted ? "Corrompido" : "",
            item.variant || "",
          ].filter(Boolean).join(" · ")}
        </span>
      )}
      {item.implicitModifiers.map((modifier) => <span className="economy-tooltip-implicit" key={modifier}>{modifier}</span>)}
      {item.explicitModifiers.map((modifier) => <span className="economy-tooltip-modifier" key={modifier}>{modifier}</span>)}
      {!hasModifiers && <span className="economy-tooltip-meta">Valor de mercado atual da poe.ninja.</span>}
      <div className="economy-tooltip-price">
        <span>{formatValue(item.chaosValue, "chaos")}</span>
        <span>{formatValue(item.divineValue, "divine")}</span>
        {item.listingCount && <span>{item.listingCount.toLocaleString("pt-BR")} listagens</span>}
      </div>
      {item.flavourText.map((line) => <em className="economy-tooltip-flavour" key={line}>{line}</em>)}
    </aside>
  );
}

export function EconomyView() {
  const [league, setLeague] = useState<string | null>(null);
  const [marketMode, setMarketMode] = useState<"currency" | "items">("currency");
  const [currencyCategory, setCurrencyCategory] = useState<CurrencyCategory>("currency");
  const category: Exclude<EconomyCategory, CurrencyCategory> = "unique_armour";
  const [items, setItems] = useState<EconomyMarketEntry[]>([]);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("Body Armour");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<EconomyMarketEntry | null>(null);
  const [pinnedItem, setPinnedItem] = useState<EconomyMarketEntry | null>(null);
  const requestIdRef = useRef(0);
  const isCurrency = marketMode === "currency";

  useEffect(() => {
    void poeNinjaEconomyService.getCurrentLeague().then(setLeague);
  }, []);

  useEffect(() => {
    const pinHoveredItem = (event: KeyboardEvent) => {
      if (event.key === "Alt" && hoveredItem) {
        event.preventDefault();
        setPinnedItem(hoveredItem);
      }
    };
    window.addEventListener("keydown", pinHoveredItem);
    return () => window.removeEventListener("keydown", pinHoveredItem);
  }, [hoveredItem]);

  const clearPreviousResults = () => {
    requestIdRef.current += 1;
    setItems([]);
    setError(null);
    setIsLoading(true);
  };

  const loadItems = async (forceRefresh = false) => {
    if (!league) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setItems([]);
    try {
      let nextItems: EconomyMarketEntry[];
      if (isCurrency) {
        nextItems = await poeNinjaEconomyService.getMarketOverview(league, currencyCategory, forceRefresh);
      } else {
        const results = await Promise.allSettled(
          sourceForFilter(itemFilter).map((source) => poeNinjaEconomyService.getMarketOverview(league, source, forceRefresh)),
        );
        const entries = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
        if (entries.length === 0) {
          const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
          throw failure?.reason ?? new Error("Não foi possível carregar os itens.");
        }
        nextItems = entries.filter((item) => matchesFilter(item, itemFilter));
      }

      if (requestId === requestIdRef.current) {
        setItems(nextItems);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar os preços.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadItems();
  }, [marketMode, currencyCategory, category, itemFilter, league]);

  const visibleItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    return !query || item.name.toLowerCase().includes(query) || item.baseType.toLowerCase().includes(query);
  });

  return (
    <section className="economy-view">
      <div className="economy-intro">
        <div>
          <h2>📈 Economia</h2>
          <p>Preços da liga {league ?? "atual"} via poe.ninja</p>
        </div>
        <button className="icon-btn" onClick={() => void loadItems(true)} disabled={isLoading} title="Atualizar preços" aria-label="Atualizar preços">↻</button>
      </div>

      <div className="economy-controls">
        <button className={`economy-tab ${isCurrency ? "active" : ""}`} onClick={() => { if (!isCurrency) { clearPreviousResults(); setSearch(""); setMarketMode("currency"); } }}>Economia</button>
        <button className={`economy-tab ${!isCurrency ? "active" : ""}`} onClick={() => { if (isCurrency) { clearPreviousResults(); setSearch(""); setMarketMode("items"); } }}>Itens</button>
        {!isCurrency && (
          <label className="economy-type-select">
            <span>ITENS</span>
            <select value={itemFilter} onChange={(event) => {
              const nextFilter = event.target.value as ItemFilter;
              if (nextFilter !== itemFilter) {
                clearPreviousResults();
                setItemFilter(nextFilter);
              }
            }} aria-label="Tipo de item">
              {ITEM_FILTERS.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}
            </select>
          </label>
        )}
      </div>

      {isCurrency && (
        <label className="economy-type-select economy-currency-select">
          <span>ECONOMIA</span>
          <select value={currencyCategory} onChange={(event) => {
            const nextCategory = event.target.value as CurrencyCategory;
            if (nextCategory !== currencyCategory) {
              clearPreviousResults();
              setCurrencyCategory(nextCategory);
            }
          }} aria-label="Categoria de economia">
            {CURRENCY_TABS.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </label>
      )}

      <label className="economy-search">
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isCurrency ? "Pesquisar moeda…" : "Pesquisar item ou tipo…"} aria-label={isCurrency ? "Pesquisar moeda" : "Pesquisar item"} />
      </label>

      {error && <p className="economy-error">{error}</p>}
      {isLoading && <p className="economy-state">Carregando preços…</p>}

      {!isLoading && !error && (
        <div className="economy-list">
          {visibleItems.map((item) => (
            <article className="economy-item" key={`${item.name}-${item.baseType}`} onMouseEnter={() => setHoveredItem(item)} onMouseLeave={() => setHoveredItem(null)}>
              {item.icon ? (
                <img className="economy-item-icon" src={item.icon} alt="" />
              ) : item.category === "divination_card" ? (
                <span className="economy-item-icon economy-card-fallback" title="Arte individual não fornecida pela poe.ninja">🂠</span>
              ) : (
                <span className="economy-item-icon">◈</span>
              )}
              <div className="economy-item-info">
                <strong>{item.name}</strong>
                {item.baseType && <span>{item.baseType}</span>}
              </div>
              <div className="economy-item-price">
                <strong>{formatValue(item.chaosValue, "c")}</strong>
                <span>{formatValue(item.divineValue, "div")}</span>
              </div>
              <MarketTooltip item={item} />
            </article>
          ))}
          {visibleItems.length === 0 && <p className="economy-state">Nenhum item encontrado.</p>}
        </div>
      )}
      {pinnedItem && <MarketTooltip item={pinnedItem} pinned onUnpin={() => setPinnedItem(null)} />}
    </section>
  );
}
