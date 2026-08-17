import { poeAuthService } from "./poeAuthService";
import { parsePoeItemList, GggRawItem } from "./poeItemParser";
import { PoeItem } from "../../types/item";
import { httpFetch } from "../http/httpClient";

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

export interface GggProfile {
  uuid: string;
  name: string;
  realm: string;
}

const POE_API_BASE = "https://api.pathofexile.com";
const POE_PUBLIC_BASE = "https://www.pathofexile.com/character-window";

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
  {
    name: "BleedBow_Exile",
    class: "Gladiator",
    league: "Standard",
    level: 89,
    realm: "pc",
  },
];

class PoeApiService {
  private lastRateLimitState: string | null = null;

  /**
   * Fetches public characters for a given PoE account name using native desktop HTTP client
   */
  public async getPublicCharacters(accountName: string, realm: string = "pc"): Promise<GggCharacter[]> {
    if (!accountName || accountName.trim() === "") {
      throw new Error("Nome da conta não informado.");
    }

    if (accountName.toLowerCase().startsWith("mock") || accountName.includes("1337")) {
      return MOCK_CHARACTERS;
    }

    const url = `${POE_PUBLIC_BASE}/get-characters?accountName=${encodeURIComponent(accountName.trim())}&realm=${realm}`;
    
    const response = await httpFetch(url, {
      headers: {
        "User-Agent": "PoeLedger/0.1.0 (contact: dev@poeledger.local)",
      },
    });

    if (response.status === 403) {
      throw new Error(
        `O perfil da conta "${accountName}" está privado no site da GGG. Desmarque "Hide Characters Tab" em pathofexile.com/my-account/privacy.`
      );
    }

    if (response.status === 404) {
      throw new Error(`Conta do Path of Exile "${accountName}" não encontrada.`);
    }

    if (response.status === 429) {
      throw new Error("Muitas requisições para a GGG. Aguarde alguns segundos.");
    }

    if (!response.ok) {
      throw new Error(`Erro ao buscar personagens da GGG (${response.status}).`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Erro retornado pela GGG.");
    }

    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }

  /**
   * Fetches items (equipped + inventory) for a given character and account
   */
  public async getPublicCharacterItems(
    accountName: string,
    characterName: string,
    realm: string = "pc"
  ): Promise<{ character: GggCharacter | null; items: PoeItem[] }> {
    if (accountName.toLowerCase().startsWith("mock") || accountName.includes("1337")) {
      return {
        character: MOCK_CHARACTERS[0],
        items: [],
      };
    }

    const url = `${POE_PUBLIC_BASE}/get-items?accountName=${encodeURIComponent(accountName.trim())}&character=${encodeURIComponent(characterName.trim())}&realm=${realm}`;

    const response = await httpFetch(url, {
      headers: {
        "User-Agent": "PoeLedger/0.1.0 (contact: dev@poeledger.local)",
      },
    });

    if (response.status === 403) {
      throw new Error("Aba de personagens privada no site da GGG.");
    }

    if (!response.ok) {
      throw new Error(`Erro ao buscar itens do personagem (${response.status}).`);
    }

    const data: { character?: GggCharacter; items?: GggRawItem[] } = await response.json();
    const rawItems = data.items || [];
    const parsedItems = parsePoeItemList(rawItems);

    return {
      character: data.character || null,
      items: parsedItems,
    };
  }

  /**
   * Authenticated OAuth endpoint fetcher
   */
  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
    const session = poeAuthService.getSession();
    if (!session.isAuthenticated || !session.token) {
      throw new Error("Usuário não autenticado no Path of Exile.");
    }

    if (session.token.access_token.startsWith("mock_")) {
      if (endpoint === "/character") {
        return MOCK_CHARACTERS as unknown as T;
      }
      if (endpoint.startsWith("/character/")) {
        return {
          character: MOCK_CHARACTERS[0],
          inventory: [],
          equipment: [],
        } as unknown as T;
      }
      if (endpoint === "/profile") {
        return {
          uuid: "mock-uuid-12345",
          name: session.accountName || "ExilePlayer",
          realm: "pc",
        } as unknown as T;
      }
    }

    const response = await httpFetch(`${POE_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${session.token.access_token}`,
        "User-Agent": "PoeLedger/0.1.0 (contact: dev@poeledger.local)",
      },
    });

    this.lastRateLimitState = response.headers.get("X-Rate-Limit-Account-State");

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "30";
      throw new Error(`Rate limit do Path of Exile atingido. Aguarde ${retryAfter} segundos.`);
    }

    if (response.status === 401) {
      poeAuthService.logout();
      throw new Error("Sessão expirada. Faça login novamente na conta da GGG.");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro na API da GGG (${response.status}): ${text}`);
    }

    return response.json();
  }

  public async getProfile(): Promise<GggProfile> {
    return this.fetchWithAuth<GggProfile>("/profile");
  }

  public async getCharacters(): Promise<GggCharacter[]> {
    const result = await this.fetchWithAuth<{ characters?: GggCharacter[] } | GggCharacter[]>("/character");
    if (Array.isArray(result)) {
      return result;
    }
    return result.characters || [];
  }

  public getRateLimitState(): string | null {
    return this.lastRateLimitState;
  }
}

export const poeApiService = new PoeApiService();
