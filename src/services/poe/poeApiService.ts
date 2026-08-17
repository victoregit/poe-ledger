import { invoke } from "@tauri-apps/api/core";
import { parsePoeItemList, GggRawItem } from "./poeItemParser";
import { PoeItem } from "../../types/item";

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
   * Fetches public characters for a given PoE account name using native Rust backend
   */
  public async getPublicCharacters(accountName: string, realm: string = "pc"): Promise<GggCharacter[]> {
    const cleanAccount = accountName.trim();
    if (!cleanAccount) {
      throw new Error("Nome da conta não informado.");
    }

    if (cleanAccount.toLowerCase().startsWith("mock") || cleanAccount.includes("1337")) {
      return MOCK_CHARACTERS;
    }

    try {
      // 1. First attempt: Direct Native Tauri Rust Command (100% immune to browser CORS)
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
      
      // If error is from GGG (e.g. private profile), rethrow the clear message
      if (errStr.includes("privado") || errStr.includes("encontrada") || errStr.includes("GGG")) {
        throw new Error(errStr);
      }

      // 2. Fallback: Browser fetch (if running outside desktop Tauri)
      try {
        const encodedAccount = encodeURIComponent(cleanAccount);
        const url = `https://www.pathofexile.com/character-window/get-characters?accountName=${encodedAccount}&realm=${realm}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) return data;
        }
      } catch {
        // Ignore secondary fallback
      }

      throw new Error(errStr);
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

    try {
      // Native Rust command
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
      return { character: null, items: [] };
    }
  }
}

export const poeApiService = new PoeApiService();
