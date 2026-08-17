export interface OverlaySettings {
  opacity: number; // 0.4 to 1.0
  scale: number;   // 0.8 to 1.3
  alwaysOnTop: boolean;
  compactMode: boolean;
}

export interface WealthSettings {
  defaultCurrency: "divine" | "chaos";
  minItemValue: number; // e.g. 0.1 divine
  maxDisplayedItems: number; // e.g. 30
  autoRefreshEnabled: boolean;
  autoRefreshIntervalMinutes: number; // e.g. 10
  includeInventory: boolean;
  includeStash: boolean;
}

export interface HotkeySettings {
  toggleOverlay: string; // e.g. "Control+Shift+Space"
  refreshWealth: string; // e.g. "Control+Shift+R"
  toggleCompact: string; // e.g. "Control+Shift+M"
}

export interface StashTabSummary {
  id?: string;
  i: number;
  n: string;
  type: string;
  color?: { r: number; g: number; b: number };
  selected?: boolean;
}

export interface AccountSettings {
  accountName: string | null;
  selectedCharacter: string | null;
  selectedLeague: string | null;
  poesessid: string | null;
  realm: "pc" | "sony" | "xbox";
  activeStashIndices: number[];
}

export interface AppSettings {
  overlay: OverlaySettings;
  wealth: WealthSettings;
  hotkeys: HotkeySettings;
  account: AccountSettings;
  enabledModules: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  overlay: {
    opacity: 0.95,
    scale: 1.0,
    alwaysOnTop: true,
    compactMode: false,
  },
  wealth: {
    defaultCurrency: "divine",
    minItemValue: 0.1,
    maxDisplayedItems: 40,
    autoRefreshEnabled: false,
    autoRefreshIntervalMinutes: 10,
    includeInventory: true,
    includeStash: true,
  },
  hotkeys: {
    toggleOverlay: "Control+Shift+Space",
    refreshWealth: "Control+Shift+R",
    toggleCompact: "Control+Shift+M",
  },
  account: {
    accountName: null,
    selectedCharacter: null,
    selectedLeague: "Standard",
    poesessid: null,
    realm: "pc",
    activeStashIndices: [0, 1, 2, 3],
  },
  enabledModules: {
    wealth: true,
    priceCheck: false,
    trade: false,
    inventory: false,
    maps: false,
    settings: true,
  },
};
