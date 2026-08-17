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
  const [selectedLeague, setSelectedLeagueState] = useState<string>(
    () => settingsManager.getSettings().account.selectedLeague || "Standard"
  );
  const [characterItems, setCharacterItems] = useState<PoeItem[]>([]);
  const [stashTabs, setStashTabs] = useState<StashTabSummary[]>([]);
  const [stashItems, setStashItems] = useState<PoeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStashLoading, setIsStashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stashError, setStashError] = useState<string | null>(null);

  // Detect current challenge league name dynamically from characters or fallback to "Settlers"
  const currentChallengeLeague = useMemo(() => {
    const nonStandard = characters.find(
      (c) => c.league && c.league !== "Standard" && c.league !== "Hardcore" && !c.league.toLowerCase().includes("void")
    );
    return nonStandard?.league || "Settlers";
  }, [characters]);

  // Main leagues requested by user: Liga Atual, Standard, Hardcore
  const availableLeagues = useMemo(() => {
    const list: string[] = [];
    if (currentChallengeLeague && currentChallengeLeague !== "Standard" && currentChallengeLeague !== "Hardcore") {
      list.push(currentChallengeLeague);
    }
    list.push("Standard");
    list.push("Hardcore");
    return list;
  }, [currentChallengeLeague]);

  const activeLeague = selectedLeague || "Standard";

  // Filter characters strictly belonging to the currently active league
  const leagueCharacters = useMemo(() => {
    return characters.filter(
      (c) => c.league && c.league.toLowerCase() === activeLeague.toLowerCase()
    );
  }, [characters, activeLeague]);

  const loadCharacters = useCallback(async (targetAccount?: string) => {
    const acc = targetAccount || accountName;
    if (!acc) return;
    setIsLoading(true);
    setError(null);
    try {
      const chars = await poeApiService.getPublicCharacters(acc, "pc");
      setCharacters(chars);

      if (chars.length > 0) {
        const savedLeague = settingsManager.getSettings().account.selectedLeague || "Standard";
        const matchingChars = chars.filter((c) => c.league?.toLowerCase() === savedLeague.toLowerCase());
        
        let charToSelect: string | null = null;
        if (matchingChars.length > 0) {
          const savedChar = settingsManager.getSettings().account.selectedCharacter;
          const exists = matchingChars.some((c) => c.name === savedChar);
          charToSelect = exists && savedChar ? savedChar : (matchingChars.find((c) => c.current)?.name || matchingChars.sort((a, b) => b.level - a.level)[0].name);
        } else {
          // If no char in saved league, use highest level char overall and its league
          const highest = [...chars].sort((a, b) => b.level - a.level)[0];
          charToSelect = highest.name;
          setSelectedLeagueState(highest.league || "Standard");
        }

        setSelectedCharacter(charToSelect);

        settingsManager.updateSettings((prev) => ({
          ...prev,
          account: {
            ...prev.account,
            accountName: acc,
            selectedCharacter: charToSelect,
            selectedLeague: savedLeague,
          },
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
    if (!char || !acc) {
      setCharacterItems([]);
      return;
    }

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

  const loadStashes = useCallback(async (targetLeague?: string) => {
    const acc = accountName;
    const leagueToUse = targetLeague || activeLeague;
    const poesessid = settingsManager.getSettings().account.poesessid;
    if (!acc) return;

    setIsStashLoading(true);
    setStashError(null);

    try {
      const tabData = await poeApiService.getStashTabs(acc, leagueToUse, poesessid, "pc");
      setStashTabs(tabData.tabs);

      let allStashItems = [...tabData.items];
      
      const maxTabsToLoad = Math.min(tabData.tabs.length, 6);
      for (let i = 1; i < maxTabsToLoad; i++) {
        try {
          const items = await poeApiService.getStashTabItems(acc, leagueToUse, i, poesessid, "pc");
          allStashItems = allStashItems.concat(items);
        } catch {
          // Continue
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
    } else {
      setCharacterItems([]);
    }
  }, [selectedCharacter, accountName, loadItems]);

  useEffect(() => {
    if (accountName && activeLeague) {
      loadStashes(activeLeague);
    }
  }, [accountName, activeLeague, loadStashes]);

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
        const league = chars.find((c) => c.name === first)?.league || "Standard";
        setSelectedLeagueState(league);

        settingsManager.updateSettings((prev) => ({
          ...prev,
          account: { ...prev.account, accountName: cleanName, selectedCharacter: first, selectedLeague: league },
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
    const char = characters.find((c) => c.name === name);
    if (char?.league) {
      setSelectedLeagueState(char.league);
    }
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        selectedCharacter: name,
        selectedLeague: char?.league || prev.account.selectedLeague,
      },
    }));
  };

  const setLeague = (league: string) => {
    setSelectedLeagueState(league);
    
    // Strictly find matching characters from this selected league (highest level first)
    const matchingChars = characters
      .filter((c) => c.league?.toLowerCase() === league.toLowerCase())
      .sort((a, b) => b.level - a.level);

    const targetChar = matchingChars.length > 0 ? matchingChars[0].name : null;
    setSelectedCharacter(targetChar);

    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        selectedLeague: league,
        selectedCharacter: targetChar,
      },
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
    availableLeagues,
    isAuthenticated: Boolean(accountName),
    characters,
    leagueCharacters,
    selectedCharacter,
    characterItems,
    stashTabs,
    stashItems,
    combinedItems,
    connectAccount,
    selectCharacter,
    setLeague,
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
