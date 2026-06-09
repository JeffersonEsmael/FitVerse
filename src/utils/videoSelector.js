// ==========================================================
// FITVERSE — SMART VIDEO SELECTOR UTILITY
// ==========================================================

const HISTORY_KEY = 'fitverse_video_history';
const INIT_TIME_KEY = 'fitverse_video_history_init';

/**
 * Loads the viewing history from localStorage.
 * Resets history automatically if 7 days have passed.
 */
export function loadHistory() {
  try {
    const initTimeStr = localStorage.getItem(INIT_TIME_KEY);
    const now = Date.now();

    if (initTimeStr) {
      const initTime = parseInt(initTimeStr, 10);
      if (now - initTime > 7 * 24 * 60 * 60 * 1000) {
        // Reset history after 7 days
        localStorage.removeItem(HISTORY_KEY);
        localStorage.setItem(INIT_TIME_KEY, now.toString());
        return {};
      }
    } else {
      localStorage.setItem(INIT_TIME_KEY, now.toString());
    }

    const historyStr = localStorage.getItem(HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : {};
  } catch (e) {
    console.error('[VideoSelector] Error loading history:', e);
    return {};
  }
}

/**
 * Saves the history back to localStorage.
 */
export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('[VideoSelector] Error saving history:', e);
  }
}

/**
 * Records a single video view in history.
 */
export function recordVideoView(videoId) {
  if (!videoId) return {};
  const history = loadHistory();
  const now = new Date().toISOString();

  if (history[videoId]) {
    history[videoId].lastViewed = now;
    history[videoId].viewCount += 1;
  } else {
    history[videoId] = {
      id: videoId,
      lastViewed: now,
      viewCount: 1
    };
  }

  saveHistory(history);
  return history;
}

/**
 * Rearranges a list of videos following the selection priority rules.
 * 
 * Priority:
 * 1. New videos (published < 3 days ago)
 * 2. Unwatched videos (chosen randomly)
 * 3. Least recently viewed (chosen randomly among the 3 oldest views)
 * 4. Never repeat the same video twice in the same session (session watched is pushed to end)
 */
export function selectNextVideos(videos, sessionWatchedIds = new Set()) {
  if (!videos || videos.length === 0) return [];

  const history = loadHistory();
  const now = Date.now();

  // Convert sessionWatchedIds to Set for fast lookup
  const sessionWatchedSet = sessionWatchedIds instanceof Set 
    ? sessionWatchedIds 
    : new Set(sessionWatchedIds);
  
  // Filter out videos watched in this session to avoid repetition
  const pool = videos.filter(v => !sessionWatchedSet.has(v.id));
  
  // If ALL videos are watched in this session, fallback to full list
  const activePool = pool.length > 0 ? pool : videos;

  // 1. New videos (published < 3 days ago)
  const newVideos = activePool.filter(v => {
    const createdAt = v.createdAt ? new Date(v.createdAt) : new Date(v.created_at || now);
    return (now - createdAt.getTime()) < 3 * 24 * 60 * 60 * 1000;
  });

  // 2. Unwatched videos (not in local history or viewCount = 0)
  const unwatchedVideos = activePool.filter(v => {
    const record = history[v.id];
    return !record || record.viewCount === 0;
  });

  // 3. Watched videos (in history with viewCount > 0)
  const watchedVideos = activePool.filter(v => {
    const record = history[v.id];
    return record && record.viewCount > 0;
  });

  let orderedList = [];

  // RULE 1: New videos first (sorted newest to oldest)
  if (newVideos.length > 0) {
    const sortedNew = [...newVideos].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.created_at || now);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.created_at || now);
      return dateB.getTime() - dateA.getTime();
    });
    orderedList.push(...sortedNew);
  }

  const isAlreadyAdded = (id) => orderedList.some(item => item.id === id);

  // RULE 2: Unwatched videos (randomized)
  const remainingUnwatched = unwatchedVideos.filter(v => !isAlreadyAdded(v.id));
  if (remainingUnwatched.length > 0) {
    const shuffledUnwatched = [...remainingUnwatched].sort(() => Math.random() - 0.5);
    orderedList.push(...shuffledUnwatched);
  }

  // RULE 3: Least recently viewed (randomized among the 3 oldest views)
  const remainingWatched = watchedVideos.filter(v => !isAlreadyAdded(v.id));
  if (remainingWatched.length > 0) {
    const sortedWatched = [...remainingWatched].sort((a, b) => {
      const dateA = new Date(history[a.id]?.lastViewed || 0);
      const dateB = new Date(history[b.id]?.lastViewed || 0);
      return dateA.getTime() - dateB.getTime();
    });

    const oldestCount = Math.min(3, sortedWatched.length);
    const oldestThree = sortedWatched.slice(0, oldestCount);
    const shuffledOldest = [...oldestThree].sort(() => Math.random() - 0.5);
    orderedList.push(...shuffledOldest);

    // Append the rest of the watched videos
    const restWatched = sortedWatched.slice(oldestCount);
    orderedList.push(...restWatched);
  }

  // Append any other active pool video left out
  const remainingActivePool = activePool.filter(v => !isAlreadyAdded(v.id));
  orderedList.push(...remainingActivePool);

  // RULE 4: session watched videos are appended at the very end to avoid duplication
  const sessionWatchedVideos = videos.filter(v => sessionWatchedSet.has(v.id) && !orderedList.some(o => o.id === v.id));
  orderedList.push(...sessionWatchedVideos);

  return orderedList;
}
