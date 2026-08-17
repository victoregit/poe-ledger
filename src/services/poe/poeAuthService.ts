export interface PoeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  username?: string;
  sub?: string;
  expires_at?: number; // timestamp ms
}

export interface AuthSession {
  isAuthenticated: boolean;
  token: PoeTokenResponse | null;
  accountName: string | null;
  realm: string;
}

const STORAGE_AUTH_KEY = "poe_ledger_auth_session_v1";
const POE_AUTH_URL = "https://www.pathofexile.com/oauth/authorize";
const POE_TOKEN_URL = "https://www.pathofexile.com/oauth/token";

// Helper for Base64-URL encoding without padding
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate cryptographically secure random string for PKCE verifier and state
function generateRandomString(length: number = 64): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer).substring(0, length);
}

// Calculate SHA-256 code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

class PoeAuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadSession();
  }

  private loadSession(): AuthSession {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH_KEY);
      if (raw) {
        const session: AuthSession = JSON.parse(raw);
        // Check if token is expired
        if (session.token && session.token.expires_at && session.token.expires_at < Date.now()) {
          console.log("Token expired on load");
          return { isAuthenticated: false, token: null, accountName: null, realm: "pc" };
        }
        return session;
      }
    } catch {
      // Ignore
    }
    return { isAuthenticated: false, token: null, accountName: null, realm: "pc" };
  }

  public getSession(): AuthSession {
    return this.currentSession;
  }

  public getAccessToken(): string | null {
    return this.currentSession.token?.access_token || null;
  }

  public hasValidAccessToken(): boolean {
    const token = this.currentSession.token;
    if (!token) return false;
    if (!token.expires_at) return Boolean(token.access_token);
    return token.expires_at > Date.now();
  }

  public saveSession(session: AuthSession): void {
    this.currentSession = session;
    try {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("Failed to persist auth session", e);
    }
  }

  public async startOfficialLogin(
    clientId: string,
    scopes: string = "account:profile account:characters account:stashes"
  ): Promise<string> {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: scopes,
    });

    const url = `${POE_AUTH_URL}?${params.toString()}`;
    return url;
  }

  public handleAuthCallback(urlOverride?: string): { code: string | null; state: string | null } {
    const target = urlOverride ?? window.location.href;
    const params = new URL(target).searchParams;
    return {
      code: params.get("code"),
      state: params.get("state"),
    };
  }

  public logout(): void {
    this.currentSession = { isAuthenticated: false, token: null, accountName: null, realm: "pc" };
    localStorage.removeItem(STORAGE_AUTH_KEY);
  }

  /**
   * Generates the OAuth 2.0 PKCE authorization URL
   */
  public async generateAuthUrl(clientId: string, redirectUri: string, scopes: string = "account:profile account:characters account:stashes"): Promise<{ url: string; verifier: string; state: string }> {
    const verifier = generateRandomString(64);
    const state = generateRandomString(32);
    const challenge = await generateCodeChallenge(verifier);

    // Save verifier and state temporarily in sessionStorage
    sessionStorage.setItem("poe_oauth_verifier", verifier);
    sessionStorage.setItem("poe_oauth_state", state);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: scopes,
      state: state,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const url = `${POE_AUTH_URL}?${params.toString()}`;
    return { url, verifier, state };
  }

  /**
   * Exchanges an authorization code for an Access Token
   */
  public async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    verifier?: string
  ): Promise<PoeTokenResponse> {
    const codeVerifier = verifier || sessionStorage.getItem("poe_oauth_verifier") || "";

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(POE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `OAuth ${clientId}/0.1.0 (contact: dev@poeledger.local)`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token exchange failed (${response.status}): ${errorText}`);
    }

    const data: PoeTokenResponse = await response.json();
    data.expires_at = Date.now() + (data.expires_in - 60) * 1000;

    const newSession: AuthSession = {
      isAuthenticated: true,
      token: data,
      accountName: data.username || data.sub || "Path of Exile Exile",
      realm: "pc",
    };

    this.saveSession(newSession);
    return data;
  }

  /**
   * Sets manual / mock token session for testing environments
   */
  public setMockAuthenticatedSession(accountName: string = "ExileTrader#1337"): void {
    const mockToken: PoeTokenResponse = {
      access_token: "mock_poe_access_token_v1",
      token_type: "Bearer",
      expires_in: 86400,
      scope: "account:profile account:characters account:stashes",
      username: accountName,
      expires_at: Date.now() + 86400 * 1000,
    };

    this.saveSession({
      isAuthenticated: true,
      token: mockToken,
      accountName: accountName,
      realm: "pc",
    });
  }
}

export const poeAuthService = new PoeAuthService();
