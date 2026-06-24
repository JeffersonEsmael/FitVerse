// ==========================================================
// FITVERSE — IMAGE PRELOADER UTILITY
// ==========================================================
// Preloads and caches image files (posts, carousel slides,
// and chat images) in device memory using Blobs.
// This prevents network delay and makes images load instantly.
//
// Bounded cache pool to avoid excessive memory usage (max 30 items).
// ==========================================================

const MAX_CACHE_SIZE = 30;

/** @type {Map<string, { blobUrl: string, abortController: AbortController }>} */
const preloadCache = new Map();

/** @type {Set<string>} active loading URLs */
const loadingUrls = new Set();

/**
 * Pre-loads an image URL into browser memory by fetching it as a blob
 * and creating a local object URL.
 *
 * @param {string} url - The image URL to preload
 * @returns {void}
 */
export function preloadImage(url) {
  if (!url || typeof url !== 'string') return;

  // Already cached or currently loading
  if (preloadCache.has(url) || loadingUrls.has(url)) return;

  // Evict oldest entries if cache is full
  if (preloadCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = preloadCache.keys().next().value;
    if (oldestKey) {
      disposeImage(oldestKey);
    }
  }

  loadingUrls.add(url);

  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      if (!loadingUrls.has(url)) {
        // Cancelled while loading
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      preloadCache.set(url, { blobUrl, abortController: controller });
      loadingUrls.delete(url);
      console.log(`[ImagePreloader] ✅ Cached: ${url.slice(-40)}`);
    })
    .catch((err) => {
      loadingUrls.delete(url);
      if (err.name !== 'AbortError') {
        console.warn(`[ImagePreloader] ⚠️ Failed to preload: ${url.slice(-40)}`, err.message);
      }
    });
}

/**
 * Pre-loads multiple image URLs.
 *
 * @param {string[]} urls - Array of image URLs to preload
 */
export function preloadImages(urls) {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => preloadImage(url));
}

/**
 * Returns the local blob URL for a preloaded image, or the original URL on cache miss.
 *
 * @param {string} originalUrl - The original image URL
 * @returns {string} The local blob URL if cached, otherwise the original URL
 */
export function getPreloadedImageUrl(originalUrl) {
  if (!originalUrl) return '';
  const cached = preloadCache.get(originalUrl);
  if (cached && cached.blobUrl) {
    return cached.blobUrl;
  }
  return originalUrl;
}

/**
 * Checks if an image URL is already preloaded in cache.
 *
 * @param {string} url - The image URL to check
 * @returns {boolean}
 */
export function isImagePreloaded(url) {
  return preloadCache.has(url);
}

/**
 * Disposes a single preloaded image, freeing memory.
 *
 * @param {string} url - The original image URL to dispose
 */
export function disposeImage(url) {
  const cached = preloadCache.get(url);
  if (cached) {
    if (cached.abortController) {
      cached.abortController.abort();
    }
    if (cached.blobUrl) {
      URL.revokeObjectURL(cached.blobUrl);
    }
    preloadCache.delete(url);
  }
  loadingUrls.delete(url);
}

/**
 * Clears ALL preloaded images.
 */
export function clearAllImagePreloads() {
  for (const [url] of preloadCache) {
    disposeImage(url);
  }
  preloadCache.clear();
  loadingUrls.clear();
}
