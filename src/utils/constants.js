// App-wide constants

export const APP_NAME = 'FitVerse';
export const APP_VERSION = '1.0.0';

// Point values for gamification
export const POINTS = {
  DAILY_LOGIN: 10,
  POST_VIDEO: 50,
  RECEIVE_LIKE: 5,
  RECEIVE_COMMENT: 10,
  COMPLETE_CHALLENGE: 100,
  NUTRISCAN_MEAL: 15,
  STREAK_BONUS: 25,
  FOLLOW_USER: 5,
};

// Level thresholds
export const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 800 },
  { level: 10, xpRequired: 2500 },
  { level: 15, xpRequired: 5000 },
  { level: 20, xpRequired: 10000 },
  { level: 25, xpRequired: 18000 },
  { level: 30, xpRequired: 30000 },
];

// Video categories
export const CATEGORIES = [
  { id: 'treino', label: 'Treino', icon: '🏋️', color: '#00D4FF' },
  { id: 'dieta', label: 'Dieta', icon: '🥗', color: '#39FF14' },
  { id: 'cardio', label: 'Cardio', icon: '🏃', color: '#FF6B35' },
  { id: 'evolução', label: 'Evolução', icon: '📈', color: '#A855F7' },
  { id: 'humor', label: 'Humor', icon: '😂', color: '#FFD700' },
  { id: 'rotina', label: 'Rotina', icon: '⏰', color: '#FF2D55' },
  { id: 'desafio', label: 'Desafio', icon: '🏆', color: '#00D4FF' },
  { id: 'motivação', label: 'Motivação', icon: '💪', color: '#39FF14' },
  { id: 'dicas', label: 'Dicas', icon: '💡', color: '#FF6B35' },
];

// Badge definitions
export const BADGES = {
  streak7: { name: 'Streak 7 Dias', icon: '🔥', color: '#FF6B35' },
  streak15: { name: 'Streak 15 Dias', icon: '🔥🔥', color: '#FF6B35' },
  streak30: { name: 'Streak 30 Dias', icon: '🔥🔥🔥', color: '#FF6B35' },
  firstPost: { name: 'Primeiro Post', icon: '🎬', color: '#00D4FF' },
  top10: { name: 'Top 10 Ranking', icon: '🏆', color: '#FFD700' },
  top3: { name: 'Top 3 Ranking', icon: '👑', color: '#FFD700' },
  viral: { name: 'Vídeo Viral', icon: '📈', color: '#A855F7' },
  nutriscan: { name: 'NutriScan Pro', icon: '🥗', color: '#39FF14' },
};
