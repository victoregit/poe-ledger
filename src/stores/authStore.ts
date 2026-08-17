import { useState, useEffect, useCallback } from "react";
import { poeAuthService, AuthSession } from "../services/poe/poeAuthService";
import { poeApiService, GggCharacter } from "../services/poe/poeApiService";
import { settingsManager } from "./settingsStore";

export function useAuth() {
  const [session, setSession] = useState<AuthSession>(() => poeAuthService.getSession());
  const [characters, setCharacters] = useState<GggCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    () => settingsManager.getSettings().account.selectedCharacter
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    if (!session.isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const chars = await poeApiService.getCharacters();
      setCharacters(chars);
      
      // Auto-select first character or current if none selected
      if (chars.length > 0) {
        const saved = settingsManager.getSettings().account.selectedCharacter;
        const exists = chars.some((c) => c.name === saved);
        if (!saved || !exists) {
          const current = chars.find((c) => c.current) || chars[0];
          selectCharacter(current.name);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar lista de personagens.");
    } finally {
      setIsLoading(false);
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    if (session.isAuthenticated) {
      loadCharacters();
    } else {
      setCharacters([]);
    }
  }, [session.isAuthenticated, loadCharacters]);

  const selectCharacter = (name: string) => {
    setSelectedCharacter(name);
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, selectedCharacter: name },
    }));
  };

  const loginWithMock = (name: string = "ExileTrader#1337") => {
    poeAuthService.setMockAuthenticatedSession(name);
    setSession(poeAuthService.getSession());
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, accountName: name },
    }));
  };

  const logout = () => {
    poeAuthService.logout();
    setSession(poeAuthService.getSession());
    setCharacters([]);
    setSelectedCharacter(null);
    settingsManager.updateSettings((prev) => ({
      ...prev,
      account: { ...prev.account, accountName: null, selectedCharacter: null },
    }));
  };

  return {
    session,
    isAuthenticated: session.isAuthenticated,
    accountName: session.accountName,
    characters,
    selectedCharacter,
    selectCharacter,
    loadCharacters,
    loginWithMock,
    logout,
    isLoading,
    error,
  };
}
