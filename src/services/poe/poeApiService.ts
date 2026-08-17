import { invoke } from "@tauri-apps/api/core";
import { parsePoeItemList, GggRawItem } from "./poeItemParser";
import { PoeItem } from "../../types/item";
import { isTauri } from "../http/isTauri";
import { poeAuthService } from "./poeAuthService";

export interface GggCharacter {
  id?: string;
  name: string;
  realm?: string;
  class: string;
  league: string;
  level: number;
  experience?: number;
  current?: boolean;
}

export interface StashTabSummary {
  id?: string;
  i: number;
  n: string;
  type: string;
  color?: { r: number; g: number; b: number };
  selected?: boolean;
}

// Mock characters for offline/demo mode
const MOCK_CHARACTERS: GggCharacter[] = [
  {
    name: "CycloneGod_Settlers",
    class: "Slayer",
    league: "Standard",
    level: 97,
    realm: "pc",
    current: true,
  },
  {
    name: "SparkArchmage_Vault",
    class: "Hierophant",
    league: "Standard",
    level: 94,
    realm: "pc",
  },
];

class PoeApiService {
  private readonly characterCache = new Map<string, { characters: GggCharacter[]; expiresAt: number }>();
  private readonly pendingCharacterRequests = new Map<string, Promise<GggCharacter[]>>();
  private characterRequestsBlockedUntil = 0;

  /**
   * Fetches public characters for a given PoE account name
   */
  public async getPublicCharacters(accountName: string, realm: string = "pc"): Promise<GggCharacter[]> {
    const cleanAccount = accountName.trim();
    if (!cleanAccount) {
      throw new Error("Nome da conta não informado.");
    }

    if (cleanAccount.toLowerCase().startsWith("mock") || cleanAccount.includes("1337")) {
      return MOCK_CHARACTERS;
    }

    const remainingBlockTime = this.characterRequestsBlockedUntil - Date.now();
    if (remainingBlockTime > 0) {
      const remainingSeconds = Math.ceil(remainingBlockTime / 1000);
      throw new Error(`A GGG limitou temporariamente as consultas. Aguarde ${remainingSeconds}s antes de tentar novamente.`);
    }

    const cacheKey = `${realm}:${cleanAccount.toLowerCase()}`;
    const cached = this.characterCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.characters;
    }

    const pending = this.pendingCharacterRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request = this.fetchPublicCharacters(cleanAccount, realm);
    this.pendingCharacterRequests.set(cacheKey, request);

    try {
      const characters = await request;
      // Character lists change infrequently. Reuse the result briefly to avoid
      // duplicate calls from multiple UI views and React's development checks.
      this.characterCache.set(cacheKey, { characters, expiresAt: Date.now() + 60_000 });
      return characters;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429") || message.toLowerCase().includes("limitou temporariamente")) {
        this.characterRequestsBlockedUntil = Date.now() + 60_000;
      }
      throw error;
    } finally {
      this.pendingCharacterRequests.delete(cacheKey);
    }
  }

  private async fetchPublicCharacters(cleanAccount: string, realm: string): Promise<GggCharacter[]> {

    if (isTauri()) {
      try {
        const rawJson = await invoke<string>("fetch_characters", {
          accountName: cleanAccount,
          realm: realm,
        });

        const data = JSON.parse(rawJson);
        if (Array.isArray(data)) {
          return data;
        }
        return [];
      } catch (err) {
        const errStr = typeof err === "string" ? err : (err instanceof Error ? err.message : String(err));
        throw new Error(errStr);
      }
    }

    // Browser fallback
    try {
      const encodedAccount = encodeURIComponent(cleanAccount);
      const targetUrl = `https://www.pathofexile.com/character-window/get-characters?accountName=${encodedAccount}&realm=${realm}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (response.status === 403) {
        throw new Error("O perfil da conta está privado. Desmarque 'Hide Characters Tab' no site do PoE.");
      }
      if (response.status === 404) {
        throw new Error(`Conta "${cleanAccount}" não encontrada.`);
      }
      if (!response.ok) {
        throw new Error(`Erro ao conectar com a GGG (${response.status}).`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (browserErr) {
      throw new Error(browserErr instanceof Error ? browserErr.message : "Falha ao conectar com a GGG.");
    }
  }

  /**
   * Fetches items (equipped + inventory) for a given character and account
   */
  public async getPublicCharacterItems(
    accountName: string,
    characterName: string,
    realm: string = "pc"
  ): Promise<{ character: GggCharacter | null; items: PoeItem[] }> {
    const cleanAccount = accountName.trim();
    const cleanChar = characterName.trim();

    if (cleanAccount.toLowerCase().startsWith("mock") || cleanAccount.includes("1337")) {
      return {
        character: MOCK_CHARACTERS[0],
        items: [],
      };
    }

    if (isTauri()) {
      try {
        const rawJson = await invoke<string>("fetch_character_items", {
          accountName: cleanAccount,
          characterName: cleanChar,
          realm: realm,
        });

        const data: { character?: GggCharacter; items?: GggRawItem[] } = JSON.parse(rawJson);
        const rawItems = data.items || [];
        const parsedItems = parsePoeItemList(rawItems);

        return {
          character: data.character || null,
          items: parsedItems,
        };
      } catch (err) {
        console.warn("Failed to fetch character items natively", err);
      }
    }

    // Browser fallback
    try {
      const targetUrl = `https://www.pathofexile.com/character-window/get-items?accountName=${encodeURIComponent(cleanAccount)}&character=${encodeURIComponent(cleanChar)}&realm=${realm}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const data = await response.json();
        const rawItems = data.items || [];
        return {
          character: data.character || null,
          items: parsePoeItemList(rawItems),
        };
      }
    } catch {
      // Ignore
    }

    return { character: null, items: [] };
  }

  /**
   * Fetches stash tabs list for a given account and league
   */
  public async getStashTabs(
    _accountName: string,
    league: string,
    _poesessid?: string | null,
    realm: string = "pc"
  ): Promise<{ numTabs: number; tabs: StashTabSummary[]; items: PoeItem[] }> {
    const cleanLeague = league.trim();
    const accessToken = poeAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error("Autenticação oficial da GGG é necessária para acessar o stash privado.");
    }

    const url = `https://api.pathofexile.com/stash/${encodeURIComponent(realm)}/${encodeURIComponent(cleanLeague)}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "PoeLedger/0.1.0",
          Accept: "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Token da conta expirado ou sem permissão para stashes. Faça login novamente.");
      }

      if (!response.ok) {
        throw new Error(`Falha ao buscar stashes da conta (${response.status}).`);
      }

      const data = await response.json();
      const stashes: StashTabSummary[] = Array.isArray(data.stashes)
        ? data.stashes.map((tab: any, index: number) => ({
            id: tab.id || `${index}`,
            i: typeof tab.index === "number" ? tab.index : index,
            n: typeof tab.name === "string" ? tab.name : `Tab ${index + 1}`,
            type: typeof tab.type === "string" ? tab.type : "unknown",
            color: tab.metadata?.colour ? { r: 0, g: 0, b: 0 } : undefined,
            selected: true,
          }))
        : [];

      const rawItems: GggRawItem[] = Array.isArray(data.stashes)
        ? data.stashes.flatMap((tab: any) => Array.isArray(tab.items) ? tab.items : [])
        : [];

      return {
        numTabs: stashes.length,
        tabs: stashes,
        items: parsePoeItemList(rawItems),
      };
    } catch (err) {
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : String(err));
      throw new Error(msg);
    }
  }

  /**
   * Fetches items from a specific stash tab.
   * Uses the official GGG account stash endpoint and a valid OAuth token.
   */
  public async getStashTabItems(
    _accountName: string,
    league: string,
    tabIndex: number,
    _poesessid?: string | null,
    realm: string = "pc"
  ): Promise<PoeItem[]> {
    const cleanLeague = league.trim();
    const accessToken = poeAuthService.getAccessToken();

    if (!accessToken) {
      throw new Error("Autenticação oficial da GGG é necessária para acessar o stash privado.");
    }

    const listResponse = await this.getStashTabs(_accountName, cleanLeague, null, realm);
    const targetTab = listResponse.tabs.find((tab) => tab.i === tabIndex || tab.id === String(tabIndex));

    if (!targetTab?.id || targetTab.id === "undefined") {
      return [];
    }

    const url = `https://api.pathofexile.com/stash/${encodeURIComponent(realm)}/${encodeURIComponent(cleanLeague)}/${encodeURIComponent(targetTab.id)}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "PoeLedger/0.1.0",
          Accept: "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Token da conta expirado ou sem permissão para stashes. Faça login novamente.");
      }

      if (!response.ok) {
        throw new Error(`Falha ao buscar aba de stash (${response.status}).`);
      }

      const data = await response.json();
      const rawItems: GggRawItem[] = Array.isArray(data.stash?.items) ? data.stash.items : [];
      return parsePoeItemList(rawItems);
    } catch (err) {
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : String(err));
      console.warn(`Failed to fetch stash tab ${tabIndex}`, msg);
      return [];
    }
  }
}

export const poeApiService = new PoeApiService();
