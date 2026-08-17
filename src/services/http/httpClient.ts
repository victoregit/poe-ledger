import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

/**
 * Universal fetch client that uses Tauri's native Rust HTTP client
 * (which has NO CORS restrictions) when in desktop mode,
 * and falls back to window.fetch when in pure browser mode.
 */
export async function httpFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await tauriFetch(url, options);
  } catch (e) {
    // Fallback to window.fetch if not in Tauri webview or plugin error
    return await window.fetch(url, options);
  }
}
