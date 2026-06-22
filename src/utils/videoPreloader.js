// ==========================================================
// FITVERSE — VIDEO PRELOADER UTILITY
// ==========================================================
// Pre-loads the next video(s) into device memory while the
// user watches the current one. This eliminates buffering
// delay when swiping between videos in the feed.
//
// The preloader creates hidden <video> elements with
// preload="auto", causing the browser to download the video
// data into memory/cache. It keeps a bounded pool to avoid
// excessive memory usage (max 3 videos cached).
// ==========================================================

const MAX_CACHE_SIZE = 3;

/** @type {Map<string, HTMLVideoElement>} */
const preloadCache = new Map();

/** @type {Set<string>} active loading URLs (to avoid duplicate fetches) */
const loadingUrls = new Set();

/**
 * Pre-loads a video URL into browser memory by creating a hidden
 * <video> element with preload="auto". The browser will download
 * the video data in the background.
 *
 * @param {string} url - The video URL to preload
 * @returns {void}
 */
export function preloadVideo(url) {
  if (!url || typeof url !== 'string') return;

  // Already cached or currently loading
  if (preloadCache.has(url) || loadingUrls.has(url)) return;

  // Evict oldest entries if cache is full
  if (preloadCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = preloadCache.keys().next().value;
    if (oldestKey) {
      disposeVideo(oldestKey);
    }
  }

  loadingUrls.add(url);

  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'absolute';
  video.style.width = '0';
  video.style.height = '0';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  video.style.zIndex = '-9999';
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');

  // Use a blob fetch for better caching control and to ensure
  // the video data is fully in device memory
  const controller = new AbortController();
  video._abortController = controller;

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
      video.src = blobUrl;
      video._blobUrl = blobUrl;
      video._originalUrl = url;

      // Append to DOM briefly to trigger browser decode
      document.body.appendChild(video);

      preloadCache.set(url, video);
      loadingUrls.delete(url);

      console.log(`[VideoPreloader] ✅ Cached: ${url.slice(-40)}`);
    })
    .catch((err) => {
      loadingUrls.delete(url);
      if (err.name !== 'AbortError') {
        console.warn(`[VideoPreloader] ⚠️ Failed to preload: ${url.slice(-40)}`, err.message);
      }
    });
}

/**
 * Pre-loads multiple video URLs. Typically called with the next
 * 1-2 videos in the feed.
 *
 * @param {string[]} urls - Array of video URLs to preload
 */
export function preloadVideos(urls) {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => preloadVideo(url));
}

/**
 * Returns the blob URL for a preloaded video, or null if not cached.
 * This blob URL can be used as the `src` of a <video> element for
 * instant playback without network requests.
 *
 * @param {string} originalUrl - The original video URL
 * @returns {string|null} The local blob URL if cached, otherwise null
 */
export function getPreloadedUrl(originalUrl) {
  if (!originalUrl) return null;
  const video = preloadCache.get(originalUrl);
  if (video && video._blobUrl) {
    return video._blobUrl;
  }
  return null;
}

/**
 * Checks if a video URL is already preloaded in cache.
 *
 * @param {string} url - The video URL to check
 * @returns {boolean}
 */
export function isPreloaded(url) {
  return preloadCache.has(url);
}

/**
 * Disposes a single preloaded video, freeing memory.
 *
 * @param {string} url - The original video URL to dispose
 */
function disposeVideo(url) {
  const video = preloadCache.get(url);
  if (video) {
    // Abort any in-flight fetch
    if (video._abortController) {
      video._abortController.abort();
    }
    // Revoke blob URL to free memory
    if (video._blobUrl) {
      URL.revokeObjectURL(video._blobUrl);
    }
    // Remove from DOM
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
    video.src = '';
    video.load(); // Force browser to release resources
    preloadCache.delete(url);
  }
  loadingUrls.delete(url);
}

/**
 * Cleans up preloaded videos that are no longer needed, keeping
 * only the ones in the `keepUrls` set. Call this when the user
 * scrolls far enough away from previously cached videos.
 *
 * @param {Set<string>|string[]} keepUrls - URLs to keep in cache
 */
export function cleanupPreloads(keepUrls) {
  const keepSet = keepUrls instanceof Set ? keepUrls : new Set(keepUrls);

  for (const [url] of preloadCache) {
    if (!keepSet.has(url)) {
      disposeVideo(url);
    }
  }
}

/**
 * Clears ALL preloaded videos. Call on unmount or when leaving
 * the feed screen entirely.
 */
export function clearAllPreloads() {
  for (const [url] of preloadCache) {
    disposeVideo(url);
  }
  preloadCache.clear();
  loadingUrls.clear();
}

/**
 * Returns the number of currently preloaded videos.
 * @returns {number}
 */
export function getPreloadCacheSize() {
  return preloadCache.size;
}
