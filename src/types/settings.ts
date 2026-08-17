export interface OverlaySettings {
  opacity: number; // 0.4 to 1.0
  scale: number;   // 0.8 to 1.3
  alwaysOnTop: boolean;
  compactMode: boolean;
}

export interface WealthSettings {
  defaultCurrency: "divine" | "chaos";
  minItemValue: number; // e.g. 1.0 divine
  maxDisplayedItems: number; // e.g. 25
  autoRefreshEnabled: boolean;
  autoRefreshIntervalMinutes: number; // e.g. 5
}

export interface HotkeySettings {
  toggleOverlay: string; // e.g. "Control+Shift+Space"
  refreshWealth: string; // e.g. "Control+Shift+R"
  toggleCompact: string; // e.g. "Control+Shift+M"
}

export interface AccountSettings {
  accountName: string | null;
  selectedCharacter: string | null;
  selectedLeague: string | null;
  realm: "pc" | "sony" | "xbox";
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
    maxDisplayedItems: 30,
    autoRefreshEnabled: false,
    autoRefreshIntervalMinutes: 10,
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
    realm: "pc",
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
