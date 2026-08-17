import { createContext, createElement, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { poeAuthService, AuthSession } from "../services/poe/poeAuthService";
import { poeApiService, GggCharacter } from "../services/poe/poeApiService";
import { settingsManager } from "./settingsStore";
import { PoeItem } from "../types/item";
import { gameWatcherService } from "../services/game/gameWatcherService";

type AuthContextValue = ReturnType<typeof useAuthState>;

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthState() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect current challenge league name dynamically from characters or fallback to "Settlers"
  const currentChallengeLeague = useMemo(() => {
    const nonStandard = characters.find(
      (c) => c.league && c.league !== "Standard" && c.league !== "Hardcore" && !c.league.toLowerCase().includes("void")
    );
    return nonStandard?.league || "Settlers";
  }, [characters]);

  // Main leagues requested: Liga Atual, Standard, Hardcore
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

  const lastAutoRefreshRef = useRef(0);

  useEffect(() => {
    const unsubscribe = gameWatcherService.subscribe((status) => {
      if (!status.isLogDetected || !accountName) {
        return;
      }

      const now = Date.now();
      if (now - lastAutoRefreshRef.current < 15000) {
        return;
      }

      lastAutoRefreshRef.current = now;

      void Promise.all([
        loadCharacters(accountName),
        selectedCharacter ? loadItems(selectedCharacter) : Promise.resolve(),
      ]);
    });

    return unsubscribe;
  }, [accountName, selectedCharacter, loadCharacters, loadItems]);

  const connectAccount = async (name: string): Promise<boolean> => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    setError(null);
    setIsLoading(true);

    try {
      // Add 30 second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Conexão expirou. Verifique se a conta é pública e tente novamente.")), 30000)
      );

      const chars = await Promise.race([
        poeApiService.getPublicCharacters(cleanName, "pc"),
        timeoutPromise,
      ]);

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
      console.error("Connect account error:", e);
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
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, accountName: null, selectedCharacter: null },
    }));
  };

  return {
    accountName,
    activeLeague,
    availableLeagues,
    isAuthenticated: Boolean(accountName) || poeAuthService.hasValidAccessToken(),
    characters,
    leagueCharacters,
    selectedCharacter,
    characterItems,
    connectAccount,
    selectCharacter,
    setLeague,
    loadCharacters,
    loadItems,
    logout,
    isLoading,
    error,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return auth;
}
