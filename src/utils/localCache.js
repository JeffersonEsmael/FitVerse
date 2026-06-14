// ==========================================================
// FITVERSE — LOCAL CACHE UTILITY (TTL-based)
// ==========================================================
// Uses localStorage to cache API responses on the user's device.
// Each entry has a TTL (time-to-live) in minutes. Expired entries
// return null and are lazily cleaned up on read.
//
// IMPORTANT: This module is the foundation of the "Local-First"
// strategy. The Supabase database is only queried when the cache
// misses or is explicitly invalidated.
// ==========================================================

const CACHE_PREFIX = 'fv_cache_';

/**
 * Saves data to localStorage with a TTL.
 * @param {string} key - Unique cache key
 * @param {*} data - JSON-serializable data
 * @param {number} ttlMinutes - Time-to-live in minutes (default: 5)
 */
export function cacheSet(key, data, ttlMinutes = 5) {
  try {
    const entry = {
      data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // localStorage full — evict oldest entries and retry once
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      _evictOldest(5);
      try {
        const entry = {
          data,
          expiresAt: Date.now() + ttlMinutes * 60 * 1000,
          cachedAt: Date.now(),
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      } catch {
        console.warn('[LocalCache] Storage full even after eviction, skipping cache write for:', key);
      }
    } else {
      console.warn('[LocalCache] Error writing cache:', e.message);
    }
  }
}

/**
 * Reads data from cache. Returns null if expired or missing.
 * @param {string} key - Cache key
 * @returns {*|null} The cached data, or null
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      // Lazily remove expired entry
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  }
}

/**
 * Checks if cache has valid (non-expired) data for a key.
 * @param {string} key
 * @returns {boolean}
 */
export function cacheHas(key) {
  return cacheGet(key) !== null;
}

/**
 * Invalidates (removes) a specific cache key.
 * @param {string} key
 */
export function cacheInvalidate(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignore
  }
}

/**
 * Invalidates all cache keys matching a prefix.
 * Use for clearing all entries of a category, e.g. 'profile_' to clear all profile caches.
 * @param {string} prefix - The key prefix (without the internal CACHE_PREFIX)
 */
export function cacheInvalidatePattern(prefix) {
  try {
    const fullPrefix = CACHE_PREFIX + prefix;
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(fullPrefix)) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

/**
 * Clears ALL FitVerse cache entries.
 */
export function cacheClearAll() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

/**
 * Returns the age of a cached entry in minutes, or Infinity if not cached.
 * @param {string} key
 * @returns {number} Age in minutes
 */
export function cacheAge(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return Infinity;
    const entry = JSON.parse(raw);
    return (Date.now() - entry.cachedAt) / (60 * 1000);
  } catch {
    return Infinity;
  }
}

// ─── Internal helpers ───────────────────────────────────────

/**
 * Evicts the N oldest cache entries to free up space.
 */
function _evictOldest(count = 5) {
  try {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(storageKey);
          const entry = JSON.parse(raw);
          entries.push({ key: storageKey, cachedAt: entry.cachedAt || 0 });
        } catch {
          // Can't parse — evict it
          entries.push({ key: storageKey, cachedAt: 0 });
        }
      }
    }

    // Sort oldest first
    entries.sort((a, b) => a.cachedAt - b.cachedAt);

    // Remove the oldest N
    const toRemove = entries.slice(0, count);
    toRemove.forEach((e) => localStorage.removeItem(e.key));
  } catch {
    // Best effort
  }
}

// ─── Cache Key Builders (centralized for consistency) ──────

export const CACHE_KEYS = {
  feed: (tab = 'forYou') => `feed_${tab}`,
  userPosts: (userId) => `user_posts_${userId}`,
  publicProfile: (userId) => `profile_${userId}`,
  leaderboard: (period) => `leaderboard_${period}`,
  challenges: () => 'challenges',
  conversations: (userId) => `conversations_${userId}`,
  notifications: (userId) => `notifications_${userId}`,
  comments: (videoId) => `comments_${videoId}`,
  following: (followerId, followingId) => `following_${followerId}_${followingId}`,
  workoutSeries: (userId) => `workout_series_${userId}`,
  gymCheckins: (userId) => `gym_checkins_${userId}`,
  interactions: (userId) => `interactions_${userId}`,
};

// ─── TTL Constants (minutes) ─────────────────────────────

export const CACHE_TTL = {
  FEED: 5,
  USER_POSTS: 10,
  PROFILE: 15,
  LEADERBOARD: 10,
  CHALLENGES: 5,
  CONVERSATIONS: 2,
  NOTIFICATIONS: 3,
  COMMENTS: 2,
  FOLLOWING: 10,
  WORKOUT_SERIES: 30,
  GYM_CHECKINS: 60,
  INTERACTIONS: 5,
};
