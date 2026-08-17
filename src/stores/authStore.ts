import { useState, useEffect, useCallback, useMemo } from "react";
import { poeAuthService, AuthSession } from "../services/poe/poeAuthService";
import { poeApiService, GggCharacter } from "../services/poe/poeApiService";
import { settingsManager } from "./settingsStore";
import { PoeItem } from "../types/item";
import { StashTabSummary } from "../types/settings";

export function useAuth() {
  const [session, setSession] = useState<AuthSession>(() => poeAuthService.getSession());
  const [accountName, setAccountName] = useState<string | null>(
    () => settingsManager.getSettings().account.accountName || session.accountName
  );
  const [characters, setCharacters] = useState<GggCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    () => settingsManager.getSettings().account.selectedCharacter
  );
  const [characterItems, setCharacterItems] = useState<PoeItem[]>([]);
  const [stashTabs, setStashTabs] = useState<StashTabSummary[]>([]);
  const [stashItems, setStashItems] = useState<PoeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStashLoading, setIsStashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stashError, setStashError] = useState<string | null>(null);

  const activeChar = characters.find((c) => c.name === selectedCharacter);
  const activeLeague = activeChar?.league || settingsManager.getSettings().account.selectedLeague || "Standard";

  const loadCharacters = useCallback(async (targetAccount?: string) => {
    const acc = targetAccount || accountName;
    if (!acc) return;
    setIsLoading(true);
    setError(null);
    try {
      const chars = await poeApiService.getPublicCharacters(acc, "pc");
      setCharacters(chars);

      if (chars.length > 0) {
        const saved = settingsManager.getSettings().account.selectedCharacter;
        const exists = chars.some((c) => c.name === saved);
        const charToSelect = exists && saved ? saved : (chars.find((c) => c.current)?.name || chars[0].name);
        setSelectedCharacter(charToSelect);
        settingsManager.updateSettings((prev) => ({
          ...prev,
          account: { ...prev.account, accountName: acc, selectedCharacter: charToSelect },
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar lista de personagens.");
    } finally {
      setIsLoading(false);
    }
  }, [accountName]);

  const loadItems = useCallback(async (charName?: string) => {
    const char = charName || selectedCharacter;
    const acc = accountName;
    if (!char || !acc) return;

    setIsLoading(true);
    try {
      const data = await poeApiService.getPublicCharacterItems(acc, char, "pc");
      setCharacterItems(data.items);
    } catch (e) {
      console.warn("Failed to load character items", e);
    } finally {
      setIsLoading(false);
    }
  }, [accountName, selectedCharacter]);

  const loadStashes = useCallback(async () => {
    const acc = accountName;
    const poesessid = settingsManager.getSettings().account.poesessid;
    if (!acc) return;

    setIsStashLoading(true);
    setStashError(null);

    try {
      const tabData = await poeApiService.getStashTabs(acc, activeLeague, poesessid, "pc");
      setStashTabs(tabData.tabs);

      let allStashItems = [...tabData.items];
      
      // Load initial active stash tabs (e.g. first 4 tabs)
      const maxTabsToLoad = Math.min(tabData.tabs.length, 6);
      for (let i = 1; i < maxTabsToLoad; i++) {
        try {
          const items = await poeApiService.getStashTabItems(acc, activeLeague, i, poesessid, "pc");
          allStashItems = allStashItems.concat(items);
        } catch {
          // Continue with next tab
        }
      }

      setStashItems(allStashItems);
    } catch (e) {
      setStashError(e instanceof Error ? e.message : "Não foi possível carregar as abas do baú.");
    } finally {
      setIsStashLoading(false);
    }
  }, [accountName, activeLeague]);

  useEffect(() => {
    if (accountName) {
      loadCharacters(accountName);
    }
  }, [accountName, loadCharacters]);

  useEffect(() => {
    if (selectedCharacter && accountName) {
      loadItems(selectedCharacter);
      loadStashes();
    }
  }, [selectedCharacter, accountName, loadItems, loadStashes]);

  const connectAccount = async (name: string): Promise<boolean> => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    setError(null);
    setIsLoading(true);

    try {
      const chars = await poeApiService.getPublicCharacters(cleanName, "pc");
      setAccountName(cleanName);
      setCharacters(chars);

      if (chars.length > 0) {
        const first = chars.find((c) => c.current)?.name || chars[0].name;
        setSelectedCharacter(first);
        settingsManager.updateSettings((prev) => ({
          ...prev,
          account: { ...prev.account, accountName: cleanName, selectedCharacter: first },
        }));
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível conectar com a conta informada.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const selectCharacter = (name: string) => {
    setSelectedCharacter(name);
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, selectedCharacter: name },
    }));
  };

  const logout = () => {
    poeAuthService.logout();
    setSession(poeAuthService.getSession());
    setAccountName(null);
    setCharacters([]);
    setSelectedCharacter(null);
    setCharacterItems([]);
    setStashTabs([]);
    setStashItems([]);
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, accountName: null, selectedCharacter: null, poesessid: null },
    }));
  };

  // Combine character inventory + stash items based on settings
  const combinedItems = useMemo(() => {
    const settings = settingsManager.getSettings();
    let result: PoeItem[] = [];
    if (settings.wealth.includeInventory) {
      result = result.concat(characterItems);
    }
    if (settings.wealth.includeStash) {
      result = result.concat(stashItems);
    }
    return result;
  }, [characterItems, stashItems]);

  return {
    accountName,
    activeLeague,
    isAuthenticated: Boolean(accountName),
    characters,
    selectedCharacter,
    characterItems,
    stashTabs,
    stashItems,
    combinedItems,
    connectAccount,
    selectCharacter,
    loadCharacters,
    loadItems,
    loadStashes,
    logout,
    isLoading,
    isStashLoading,
    error,
    stashError,
  };
}
