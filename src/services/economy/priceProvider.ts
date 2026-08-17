import { economyCache } from "./economyCache";

export interface ItemPriceQuote {
  name: string;
  baseType?: string;
  category: string;
  priceInChaos: number;
  priceInDivine: number;
  confidence: "high" | "medium" | "low";
}

export interface PriceProvider {
  name: string;
  fetchPrices(league: string): Promise<Map<string, ItemPriceQuote>>;
}

const POE_NINJA_BASE = "https://poe.ninja/api/data";

// Standard fallback base rates in case API is unreachable or rate limited
const FALLBACK_PRICES: Record<string, { chaos: number; div: number }> = {
  "Mageblood": { chaos: 27000, div: 180.0 },
  "Headhunter": { chaos: 11250, div: 75.0 },
  "Nimis": { chaos: 7500, div: 50.0 },
  "The Apothecary": { chaos: 5250, div: 35.0 },
  "Mirror Shard": { chaos: 3300, div: 22.0 },
  "Mirror of Kalandra": { chaos: 65000, div: 430.0 },
  "Awakened Enlighten Support": { chaos: 2700, div: 18.0 },
  "Divine Orb": { chaos: 150, div: 1.0 },
  "Chaos Orb": { chaos: 1, div: 0.0067 },
  "Exalted Orb": { chaos: 12, div: 0.08 },
  "Ancient Orb": { chaos: 8, div: 0.053 },
  "Orb of Annulment": { chaos: 5, div: 0.033 },
};

export class PoeNinjaPriceProvider implements PriceProvider {
  public name = "poe.ninja";

  public async fetchPrices(league: string = "Standard"): Promise<Map<string, ItemPriceQuote>> {
    const cacheKey = `prices_${league}`;
    const cached = economyCache.get<Record<string, ItemPriceQuote>>(cacheKey);

    if (cached) {
      return new Map(Object.entries(cached));
    }

    const priceMap = new Map<string, ItemPriceQuote>();

    // Seed with fallback prices first
    let divineInChaos = 150;
    for (const [name, p] of Object.entries(FALLBACK_PRICES)) {
      priceMap.set(name.toLowerCase(), {
        name,
        category: "general",
        priceInChaos: p.chaos,
        priceInDivine: p.div,
        confidence: "medium",
      });
    }

    try {
      // 1. Fetch currency overview from poe.ninja
      const currUrl = `${POE_NINJA_BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=Currency`;
      const currRes = await fetch(currUrl);
      
      if (currRes.ok) {
        const currData = await currRes.json();
        if (currData.lines && Array.isArray(currData.lines)) {
          // Find Divine Orb exchange rate to compute divine values
          const divineEntry = currData.lines.find((l: { currencyTypeName?: string }) => l.currencyTypeName === "Divine Orb");
          if (divineEntry && divineEntry.chaosEquivalent) {
            divineInChaos = divineEntry.chaosEquivalent;
          }

          for (const line of currData.lines) {
            const currencyName = line.currencyTypeName;
            const chaosValue = line.chaosEquivalent || 0;
            if (currencyName && chaosValue > 0) {
              priceMap.set(currencyName.toLowerCase(), {
                name: currencyName,
                category: "currency",
                priceInChaos: chaosValue,
                priceInDivine: chaosValue / divineInChaos,
                confidence: "high",
              });
            }
          }
        }
      }
    } catch {
      // poe.ninja may be rate limited or blocked by CORS in web view; fallbacks are preserved
      console.log("Using cached/fallback price database for economy service");
    }

    // Convert map to plain object to store in cache
    const plainObj: Record<string, ItemPriceQuote> = {};
    priceMap.forEach((val, key) => {
      plainObj[key] = val;
    });

    economyCache.set(cacheKey, plainObj, 15 * 60 * 1000); // 15 mins cache
    return priceMap;
  }
}

export const poeNinjaPriceProvider = new PoeNinjaPriceProvider();
