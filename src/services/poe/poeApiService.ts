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

export interface GggProfile {
  uuid: string;
  name: string;
  realm: string;
}

const POE_API_BASE = "https://api.pathofexile.com";

// Mock characters for development testing or offline preview
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

  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
    const session = poeAuthService.getSession();
    if (!session.isAuthenticated || !session.token) {
      throw new Error("Usuário não autenticado no Path of Exile.");
    }

    // Check if running with mock token
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

    const response = await fetch(`${POE_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${session.token.access_token}`,
        "User-Agent": "PoeLedger/0.1.0 (contact: dev@poeledger.local)",
      },
    });

    // Capture GGG rate limit response headers
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

  public async getCharacterData(characterName: string): Promise<unknown> {
    return this.fetchWithAuth(`/character/${encodeURIComponent(characterName)}`);
  }

  public getRateLimitState(): string | null {
    return this.lastRateLimitState;
  }
}

export const poeApiService = new PoeApiService();
