/**
 * Simple in-memory TTL cache for reducing database queries
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached value if exists and not expired
 */
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

/**
 * Set cache value with TTL in milliseconds
 */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache entries matching a pattern
 * @param pattern - String prefix to match (e.g., "holidays:" invalidates all holiday caches)
 */
export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCacheKey(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  TIMEZONE: 60 * 60 * 1000,        // 1 hour
  HOLIDAYS: 24 * 60 * 60 * 1000,   // 24 hours
  STREAK_LEADERBOARD: 5 * 60 * 1000, // 5 minutes
  GUILD_SETTINGS: 60 * 60 * 1000,  // 1 hour
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  timezone: (guildId: string) => `tz:${guildId}`,
  holidays: (guildId: string) => `holidays:${guildId}`,
  streakLeaderboard: (guildId: string) => `streaks:${guildId}`,
  guildSettings: (guildId: string) => `settings:${guildId}`,
} as const;
