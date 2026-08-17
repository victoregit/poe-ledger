import { invoke } from "@tauri-apps/api/core";
import { parsePoeItemList, GggRawItem } from "./poeItemParser";
import { PoeItem } from "../../types/item";
import { isTauri } from "../http/isTauri";

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

    // 1. If running inside Tauri desktop app: use direct native Rust command
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

    // 2. If running inside standard browser tab (npm run dev): use browser proxy fallback
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
}

export const poeApiService = new PoeApiService();
