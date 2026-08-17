import { PoeItem, ValuedItem } from "../../types/item";
import { PriceProvider, poeNinjaPriceProvider } from "./priceProvider";

export interface ValuationResult {
  valuedItems: ValuedItem[];
  totalValueInDivine: number;
  totalValueInChaos: number;
  pricedItemsCount: number;
  unpricedItemsCount: number;
  lastUpdated: number;
}

class EconomyService {
  private provider: PriceProvider;

  constructor(provider: PriceProvider = poeNinjaPriceProvider) {
    this.provider = provider;
  }

  public setProvider(provider: PriceProvider): void {
    this.provider = provider;
  }

  /**
   * Valuates a single item using the price provider
   */
  public async valuateItem(item: PoeItem, league: string = "Standard"): Promise<ValuedItem> {
    const priceMap = await this.provider.fetchPrices(league);

    const lookupKey = (item.name || item.typeLine || "").toLowerCase().trim();
    const quote = priceMap.get(lookupKey);

    const stack = item.stackSize && item.stackSize > 0 ? item.stackSize : 1;

    if (quote && quote.priceInDivine > 0) {
      return {
        item,
        unitPrice: quote.priceInDivine,
        totalPrice: quote.priceInDivine * stack,
        currency: "divine",
        priceSource: this.provider.name,
        priceAvailable: true,
        lastUpdated: Date.now(),
      };
    }

    // Item has no available price quote
    return {
      item,
      unitPrice: 0,
      totalPrice: 0,
      currency: "divine",
      priceSource: this.provider.name,
      priceAvailable: false,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Valuates a collection of PoE items, normalizes currency and sorts descending by value
   */
  public async valuateItems(items: PoeItem[], league: string = "Standard"): Promise<ValuationResult> {
    const priceMap = await this.provider.fetchPrices(league);

    let pricedCount = 0;
    let unpricedCount = 0;
    let totalDivine = 0;
    let totalChaos = 0;

    const valuedItems: ValuedItem[] = items.map((item) => {
      const lookupKey = (item.name || item.typeLine || "").toLowerCase().trim();
      const quote = priceMap.get(lookupKey);
      const stack = item.stackSize && item.stackSize > 0 ? item.stackSize : 1;

      if (quote && quote.priceInDivine > 0) {
        pricedCount++;
        const itemTotalDiv = quote.priceInDivine * stack;
        const itemTotalChaos = quote.priceInChaos * stack;
        totalDivine += itemTotalDiv;
        totalChaos += itemTotalChaos;

        return {
          item,
          unitPrice: quote.priceInDivine,
          totalPrice: itemTotalDiv,
          currency: "divine",
          priceSource: this.provider.name,
          priceAvailable: true,
          lastUpdated: Date.now(),
        };
      }

      unpricedCount++;
      return {
        item,
        unitPrice: 0,
        totalPrice: 0,
        currency: "divine",
        priceSource: this.provider.name,
        priceAvailable: false,
        lastUpdated: Date.now(),
      };
    });

    // Sort descending by total price
    valuedItems.sort((a, b) => b.totalPrice - a.totalPrice);

    return {
      valuedItems,
      totalValueInDivine: totalDivine,
      totalValueInChaos: totalChaos,
      pricedItemsCount: pricedCount,
      unpricedItemsCount: unpricedCount,
      lastUpdated: Date.now(),
    };
  }
}

export const economyService = new EconomyService();
