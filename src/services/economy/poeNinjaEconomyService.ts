import { economyCache } from "./economyCache";
import { httpFetch } from "../http/httpClient";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../http/isTauri";

const POE_NINJA_API = "https://poe.ninja/poe1/api/economy";

interface PoeNinjaOverviewResponse {
  lines?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>> | Record<string, unknown>;
  core?: Record<string, unknown>;
  currencyDetails?: Array<Record<string, unknown>>;
}

export interface EconomyCurrency {
  name: string;
  chaosValue: number;
  divineValue: number | null;
}

export interface EconomyItem {
  name: string;
  baseType: string;
  chaosValue: number;
  divineValue: number | null;
  icon: string | null;
}

export interface BasicEconomySnapshot {
  league: string;
  currencies: EconomyCurrency[];
  uniqueArmours: EconomyItem[];
  updatedAt: number;
}

export type EconomyCategory = "currency" | "fragment" | "allflame_ember" | "omen" | "tattoo" | "runegraft" | "scarab" | "delirium_orb" | "fossil" | "resonator" | "essence" | "divination_card" | "artifact" | "unique_armour" | "unique_weapon" | "unique_accessory" | "unique_flask" | "unique_jewel";

export interface EconomyMarketEntry {
  name: string;
  baseType: string;
  category: EconomyCategory;
  chaosValue: number;
  divineValue: number | null;
  icon: string | null;
  itemClass: string | null;
  levelRequired: number | null;
  links: number | null;
  variant: string | null;
  implicitModifiers: string[];
  explicitModifiers: string[];
  flavourText: string[];
  listingCount: number | null;
  itemLevel: number | null;
  quality: number | null;
  corrupted: boolean;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringList);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "name", "value", "display"]) {
      if (typeof record[key] === "string") return [record[key]];
    }
    return Object.values(record).flatMap(stringList);
  }
  return [];
}

function overviewLines(data: PoeNinjaOverviewResponse): Array<Record<string, unknown>> {
  if (Array.isArray(data.lines)) return data.lines;
  const nested = (data as PoeNinjaOverviewResponse & { data?: PoeNinjaOverviewResponse }).data;
  return Array.isArray(nested?.lines) ? nested.lines : [];
}

function nestedRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function readableId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function imageUrl(value: string | null): string | null {
  if (!value) return null;
  // Economy responses expose game art as /gen/image/... paths. These assets
  // are served by the PoE CDN, while the poe.ninja host may reject WebView
  // image requests or redirect them without preserving the image response.
  return value.startsWith("/") ? `https://web.poecdn.com${value}` : value;
}

function collectMetadata(value: unknown, inheritedKey: string | null = null, depth = 0): Array<{ key: string | null; value: Record<string, unknown> }> {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectMetadata(entry, null, depth + 1));
  const record = nestedRecord(value);
  if (Object.keys(record).length === 0) return [];
  const isMetadata = Boolean(firstText(record.name, record.itemName, record.displayName, record.icon, record.image));
  if (isMetadata) return [{ key: inheritedKey, value: record }];
  return Object.entries(record).flatMap(([key, entry]) => collectMetadata(entry, key, depth + 1));
}

class PoeNinjaEconomyService {
  public async getCurrentLeague(): Promise<string> {
    const cacheKey = "current_economy_league";
    const cached = economyCache.get<string>(cacheKey);
    if (cached) return cached;

    try {
      const data = isTauri()
        ? await invoke<string>("fetch_poe_ninja_economy_leagues").then(JSON.parse) as unknown
        : await httpFetch(`${POE_NINJA_API}/leagues`).then((response) => response.json()) as unknown;
      const leagues = Array.isArray(data) ? data : [];
      const activeLeague = leagues[0] as { id?: unknown; name?: unknown } | undefined;
      const league = typeof activeLeague?.id === "string"
        ? activeLeague.id
        : typeof activeLeague?.name === "string"
          ? activeLeague.name
          : "Allflame";
      economyCache.set(cacheKey, league, 15 * 60 * 1000);
      return league;
    } catch {
      return "Allflame";
    }
  }

  public async getMarketOverview(
    league: string,
    category: EconomyCategory,
    forceRefresh = false,
  ): Promise<EconomyMarketEntry[]> {
    const cleanLeague = league.trim() || "Allflame";
    const cacheKey = `market_overview_${cleanLeague.toLowerCase()}_${category}`;
    if (!forceRefresh) {
      const cached = economyCache.get<EconomyMarketEntry[]>(cacheKey);
      if (cached) return cached;
    }

    const data = isTauri()
      ? await invoke<string>("fetch_poe_ninja_economy", { league: cleanLeague, dataset: category }).then(JSON.parse) as PoeNinjaOverviewResponse
      : await this.fetchDatasetFromBrowser(cleanLeague, category);
    const lines = overviewLines(data);
    const isExchangeCategory = !["currency", "unique_armour", "unique_weapon", "unique_accessory", "unique_flask", "unique_jewel"].includes(category);
    const core = nestedRecord(data.core);
    const rawItems = [core.items, data.items, data.currencyDetails];
    const metadataEntries = collectMetadata(rawItems);
    const currencyMetadata = new Map<string, Record<string, unknown>>();
    const currencyMetadataByName = new Map<string, Record<string, unknown>>();
    for (const { key: mapKey, value: entry } of metadataEntries) {
      for (const key of [mapKey, entry.id, entry.itemId, entry.currencyId, entry.currencyTypeId, entry.tradeId, entry.detailsId]) {
        if (typeof key === "string" || typeof key === "number") currencyMetadata.set(String(key), entry);
      }
      const name = firstText(entry.name, entry.currencyTypeName);
      if (name) currencyMetadataByName.set(name.toLowerCase(), entry);
    }
    const rates = nestedRecord(core.rates);
    const currencyByName = (name: string) => metadataEntries.map((entry) => entry.value).find((entry) => firstText(entry.name)?.toLowerCase() === name);
    const divineMetadata = currencyByName("divine orb") ?? currencyByName("divine");
    const chaosMetadata = currencyByName("chaos orb") ?? currencyByName("chaos");
    const primaryCurrency = firstText(core.primary)?.toLowerCase() ?? "";
    const divineRate = primaryCurrency === "divine"
      ? 1
      : numberValue(rates[String(divineMetadata?.id ?? "divine")]);
    const chaosRate = primaryCurrency === "chaos"
      ? 1
      : numberValue(rates[String(chaosMetadata?.id ?? "chaos")]);
    const divineLine = lines.find((line) => line.currencyTypeName === "Divine Orb" || line.name === "Divine Orb");
    const divineInChaos = numberValue(divineLine?.chaosEquivalent)
      || numberValue(divineLine?.chaosValue)
      || numberValue(divineLine?.primaryValue)
      || 1;

    const entries = lines
      .map((line): EconomyMarketEntry => {
        const item = nestedRecord(line.item);
        const currencyItem = currencyMetadata.get(String(line.id ?? line.itemId ?? line.currencyId ?? line.currencyTypeId ?? line.tradeId ?? line.detailsId))
          ?? currencyMetadataByName.get(firstText(line.currencyTypeName, line.name)?.toLowerCase() ?? "")
          ?? {};
        const primaryValue = numberValue(line.primaryValue);
        const chaosValue = numberValue(
          category === "currency" || isExchangeCategory
            ? (line.chaosEquivalent ?? line.chaosValue ?? (primaryCurrency === "chaos" ? primaryValue : chaosRate > 0 ? primaryValue * chaosRate : primaryValue))
            : (line.chaosValue ?? line.primaryValue),
        );
        const derivedDivineValue = category === "currency" || isExchangeCategory
          ? (primaryCurrency === "divine" ? primaryValue : divineRate > 0 ? primaryValue * divineRate : 0)
          : 0;
        const rawDivineValue = numberValue(line.divineValue ?? line.primaryValueInDivine) || derivedDivineValue;
        return {
          category,
          name: firstText(
            category === "currency" || isExchangeCategory ? currencyItem.name : null,
            category === "currency" || isExchangeCategory ? line.currencyTypeName : null,
            line.name,
            line.itemName,
            line.displayName,
            line.item,
            line.currency,
            item.name,
            item.itemName,
            line.baseType,
            item.baseType,
            readableId(line.detailsId),
            readableId(line.itemId),
          ) ?? "Item sem nome",
          baseType: firstText(line.baseType, line.itemType, item.baseType, item.typeLine) ?? "",
          chaosValue,
          divineValue: rawDivineValue > 0
            ? rawDivineValue
            : (category === "currency" && chaosValue > 0 ? chaosValue / divineInChaos : null),
          icon: imageUrl(firstText(line.icon, line.image, item.icon, currencyItem.icon, currencyItem.image)),
          itemClass: firstText(line.itemClass, item.itemClass),
          levelRequired: numberValue(line.levelRequired ?? item.levelRequired) || null,
          links: numberValue(line.links ?? item.links) || null,
          variant: firstText(line.variant, item.variant),
          implicitModifiers: [
            ...stringList(line.implicitModifiers ?? item.implicitModifiers),
            ...stringList(line.enchantMods ?? item.enchantMods),
            ...stringList(line.utilityMods ?? item.utilityMods),
          ],
          explicitModifiers: [
            ...stringList(line.explicitModifiers ?? item.explicitModifiers),
            ...stringList(line.fracturedMods ?? item.fracturedMods),
            ...stringList(line.corruptedMods ?? item.corruptedMods),
            ...stringList(line.stats ?? item.stats),
          ],
          flavourText: stringList(line.flavourText ?? item.flavourText),
          listingCount: numberValue(line.listingCount) || numberValue(line.count) || null,
          itemLevel: numberValue(line.itemLevel) || null,
          quality: numberValue(line.quality) || null,
          corrupted: line.corrupted === true,
        };
      })
      .filter((entry) => entry.chaosValue > 0 || entry.divineValue !== null)
      .sort((a, b) => b.chaosValue - a.chaosValue);

    economyCache.set(cacheKey, entries, 5 * 60 * 1000);
    return entries;
  }

  public async getBasicEconomy(league: string = "Allflame", forceRefresh = false): Promise<BasicEconomySnapshot> {
    const cleanLeague = league.trim() || "Allflame";
    const cacheKey = `basic_economy_${cleanLeague.toLowerCase()}`;

    if (!forceRefresh) {
      const cached = economyCache.get<BasicEconomySnapshot>(cacheKey);
      if (cached) return cached;
    }

    const [currencyData, itemData] = isTauri()
      ? await Promise.all([
          invoke<string>("fetch_poe_ninja_economy", { league: cleanLeague, dataset: "currency" }).then(JSON.parse) as Promise<PoeNinjaOverviewResponse>,
          invoke<string>("fetch_poe_ninja_economy", { league: cleanLeague, dataset: "unique_armour" }).then(JSON.parse) as Promise<PoeNinjaOverviewResponse>,
        ])
      : await this.fetchFromBrowser(cleanLeague);
    const rawCurrencies = currencyData.lines ?? [];
    const divineLine = rawCurrencies.find((line) => line.currencyTypeName === "Divine Orb");
    const divineInChaos = numberValue(divineLine?.chaosEquivalent) || 1;

    const currencies = rawCurrencies
      .map((line): EconomyCurrency => ({
        name: typeof line.currencyTypeName === "string" ? line.currencyTypeName : "Moeda desconhecida",
        chaosValue: numberValue(line.chaosEquivalent),
        divineValue: numberValue(line.chaosEquivalent) ? numberValue(line.chaosEquivalent) / divineInChaos : null,
      }))
      .filter((currency) => currency.chaosValue > 0)
      .sort((a, b) => b.chaosValue - a.chaosValue)
      .slice(0, 5);

    const uniqueArmours = (itemData.lines ?? [])
      .map((line): EconomyItem => {
        const chaosValue = numberValue(line.chaosValue);
        const divineValue = numberValue(line.divineValue);
        return {
          name: typeof line.name === "string" ? line.name : "Item único",
          baseType: typeof line.baseType === "string" ? line.baseType : "",
          chaosValue,
          divineValue: divineValue > 0 ? divineValue : (chaosValue > 0 ? chaosValue / divineInChaos : null),
          icon: typeof line.icon === "string" ? line.icon : null,
        };
      })
      .filter((item) => item.chaosValue > 0 || item.divineValue !== null)
      .sort((a, b) => b.chaosValue - a.chaosValue)
      .slice(0, 5);

    const snapshot: BasicEconomySnapshot = {
      league: cleanLeague,
      currencies,
      uniqueArmours,
      updatedAt: Date.now(),
    };

    economyCache.set(cacheKey, snapshot, 5 * 60 * 1000);
    return snapshot;
  }

  private async fetchFromBrowser(league: string): Promise<[PoeNinjaOverviewResponse, PoeNinjaOverviewResponse]> {
    const query = new URLSearchParams({ league });
    const [currencyResponse, itemResponse] = await Promise.all([
      httpFetch(`${POE_NINJA_API}/exchange/current/overview?${query.toString()}&type=Currency`),
      httpFetch(`${POE_NINJA_API}/stash/current/item/overview?${query.toString()}&type=UniqueArmour`),
    ]);

    if (!currencyResponse.ok || !itemResponse.ok) {
      throw new Error("Não foi possível carregar a economia da poe.ninja agora.");
    }

    return [
      await currencyResponse.json() as PoeNinjaOverviewResponse,
      await itemResponse.json() as PoeNinjaOverviewResponse,
    ];
  }

  private async fetchDatasetFromBrowser(league: string, category: EconomyCategory): Promise<PoeNinjaOverviewResponse> {
    const type = category === "currency"
      ? "Currency"
      : category === "unique_armour"
        ? "UniqueArmour"
        : category === "unique_weapon"
          ? "UniqueWeapon"
          : category === "unique_accessory"
            ? "UniqueAccessory"
            : category === "unique_flask"
              ? "UniqueFlask"
              : "UniqueJewel";
    const path = category === "currency" ? "stash/current/currency/overview" : "stash/current/item/overview";
    const response = await httpFetch(`${POE_NINJA_API}/${path}?league=${encodeURIComponent(league)}&type=${type}`);
    if (!response.ok) throw new Error("Não foi possível carregar a economia da poe.ninja agora.");
    return await response.json() as PoeNinjaOverviewResponse;
  }
}

export const poeNinjaEconomyService = new PoeNinjaEconomyService();
