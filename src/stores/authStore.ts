import { useState, useEffect, useCallback } from "react";
import { poeAuthService, AuthSession } from "../services/poe/poeAuthService";
import { poeApiService, GggCharacter } from "../services/poe/poeApiService";
import { settingsManager } from "./settingsStore";
import { PoeItem } from "../types/item";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (accountName) {
      loadCharacters(accountName);
    }
  }, [accountName, loadCharacters]);

  useEffect(() => {
    if (selectedCharacter && accountName) {
      loadItems(selectedCharacter);
    }
  }, [selectedCharacter, accountName, loadItems]);

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
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, accountName: null, selectedCharacter: null },
    }));
  };

  return {
    accountName,
    isAuthenticated: Boolean(accountName),
    characters,
    selectedCharacter,
    characterItems,
    connectAccount,
    selectCharacter,
    loadCharacters,
    loadItems,
    logout,
    isLoading,
    error,
  };
}
