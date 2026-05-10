// Utility formatters

/**
 * Format large numbers with K/M suffix
 */
export function formatCount(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

/**
 * Format date relative to now
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Format calories with kcal suffix
 */
export function formatCalories(n) {
  return `${Math.round(n)} kcal`;
}

/**
 * Format grams
 */
export function formatGrams(n) {
  return `${Math.round(n * 10) / 10}g`;
}

/**
 * Calculate level from XP
 */
export function calculateLevel(xp) {
  const thresholds = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000, 7000, 10000, 14000, 18000, 23000, 30000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

/**
 * Generate avatar initials color
 */
export function getAvatarColor(name) {
  const colors = ['#00D4FF', '#39FF14', '#FF6B35', '#A855F7', '#FF2D55', '#FFD700'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
