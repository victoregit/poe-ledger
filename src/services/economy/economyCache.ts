export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = "poe_ledger_econ_cache_";
const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

class EconomyCache {
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  public get<T>(key: string): T | null {
    // 1. Check memory cache
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        return memEntry.data;
      }
      this.memoryCache.delete(key);
    }

    // 2. Check localStorage
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (raw) {
        const stored: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() < stored.expiresAt) {
          this.memoryCache.set(key, stored);
          return stored.data;
        }
        localStorage.removeItem(CACHE_PREFIX + key);
      }
    } catch {
      // Ignore
    }

    return null;
  }

  public set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.memoryCache.set(key, entry);

    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn("Storage quota exceeded or error storing economy cache", e);
    }
  }

  public clear(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // Ignore
    }
  }
}

export const economyCache = new EconomyCache();
