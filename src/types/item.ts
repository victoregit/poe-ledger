export type ItemRarity = "normal" | "magic" | "rare" | "unique" | "gem" | "currency" | "divination";

export type ItemCategory = "equipment" | "currency" | "gem" | "card" | "map" | "other";

export interface PoeItem {
  id: string;
  name: string;
  typeLine: string;
  baseType?: string;
  rarity: ItemRarity;
  category: ItemCategory;
  icon?: string;
  stackSize?: number;
  maxStackSize?: number;
  itemLevel?: number;
  identified?: boolean;
  corrupted?: boolean;
  rawData?: unknown;
}

export interface ValuedItem {
  item: PoeItem;
  unitPrice: number;
  totalPrice: number;
  currency: "divine" | "chaos";
  priceSource: string;
  priceAvailable: boolean;
  lastUpdated: number;
}
