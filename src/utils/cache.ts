/**
 * Simple in-memory TTL cache to reduce database queries
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL = {
  TIMEZONE: 60 * 60 * 1000,        // 1 hour
  HOLIDAYS: 24 * 60 * 60 * 1000,   // 24 hours
  STREAK_LEADERBOARD: 5 * 60 * 1000, // 5 minutes
  GUILD_SETTINGS: 60 * 60 * 1000,  // 1 hour
} as const;

export const CACHE_KEYS = {
  timezone: (guildId: string) => `tz:${guildId}`,
  holidays: (guildId: string) => `holidays:${guildId}`,
  streakLeaderboard: (guildId: string) => `streaks:${guildId}`,
  guildSettings: (guildId: string) => `settings:${guildId}`,
} as const;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateCachePattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

export function clearAllCache(): void {
  cache.clear();
}
