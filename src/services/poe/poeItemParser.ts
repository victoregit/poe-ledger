import { PoeItem, ItemRarity, ItemCategory } from "../../types/item";

export interface GggRawItem {
  id?: string;
  name?: string;
  typeLine?: string;
  baseType?: string;
  frameType?: number;
  icon?: string;
  stackSize?: number;
  maxStackSize?: number;
  ilvl?: number;
  identified?: boolean;
  corrupted?: boolean;
  descrText?: string;
  properties?: Array<{ name: string; values: Array<[string, number]> }>;
  explicitMods?: string[];
  implicitMods?: string[];
  utilityMods?: string[];
  [key: string]: unknown;
}

export function parseGggRarity(frameType?: number): ItemRarity {
  switch (frameType) {
    case 0:
      return "normal";
    case 1:
      return "magic";
    case 2:
      return "rare";
    case 3:
    case 9: // Relic / Foil
      return "unique";
    case 4:
      return "gem";
    case 5:
      return "currency";
    case 6:
      return "divination";
    default:
      return "normal";
  }
}

export function parseGggCategory(raw: GggRawItem): ItemCategory {
  const frameType = raw.frameType;
  if (frameType === 5) return "currency";
  if (frameType === 4) return "gem";
  if (frameType === 6) return "card";

  // Check icon URL or properties for equipment clues
  const icon = raw.icon || "";
  if (icon.includes("/Armour/") || icon.includes("/Weapons/") || icon.includes("/Jewellery/") || icon.includes("/Belts/") || icon.includes("/Rings/") || icon.includes("/Amulets/")) {
    return "equipment";
  }

  if (icon.includes("/Maps/")) return "map";
  if (frameType === 3 || frameType === 2) return "equipment";

  return "other";
}

export function parsePoeItem(raw: GggRawItem, fallbackId?: string): PoeItem {
  const name = (raw.name || "").replace(/<<.*?>>/g, "").trim();
  const typeLine = (raw.typeLine || "").replace(/<<.*?>>/g, "").trim();
  const rarity = parseGggRarity(raw.frameType);
  const category = parseGggCategory(raw);

  return {
    id: raw.id || fallbackId || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name,
    typeLine: typeLine,
    baseType: raw.baseType || typeLine,
    rarity: rarity,
    category: category,
    icon: raw.icon,
    stackSize: raw.stackSize || 1,
    maxStackSize: raw.maxStackSize || 1,
    itemLevel: raw.ilvl,
    identified: raw.identified ?? true,
    corrupted: raw.corrupted ?? false,
    rawData: raw,
  };
}

export function parsePoeItemList(rawItems: GggRawItem[]): PoeItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((raw, index) => parsePoeItem(raw, `item-${index}`));
}
