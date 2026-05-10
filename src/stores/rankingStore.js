import { create } from 'zustand';
import { supabase } from '../config/supabase';

const sampleRanking = [
  { uid: 'r1', displayName: 'Lucas Trainer', username: 'fitpro_lucas', photoURL: '', level: 28, xp: 8450, streak: 15, points: 2850, trend: 'up', badges: ['streak15','top3'] },
  { uid: 'r2', displayName: 'Ana Nutrição', username: 'nutri_ana', photoURL: '', level: 25, xp: 7200, streak: 22, points: 2720, trend: 'up', badges: ['streak21','nutriscan'] },
  { uid: 'r3', displayName: 'Rafael GymBro', username: 'gym_rafael', photoURL: '', level: 22, xp: 6100, streak: 10, points: 2540, trend: 'same', badges: ['streak7','viral'] },
  { uid: 'r4', displayName: 'Maria Coach', username: 'coach_maria', photoURL: '', level: 20, xp: 5500, streak: 8, points: 2380, trend: 'down', badges: ['streak7'] },
  { uid: 'r5', displayName: 'FitUser', username: 'fituser', photoURL: '', level: 12, xp: 2450, streak: 7, points: 1950, trend: 'up', badges: ['streak7','firstPost'] },
  { uid: 'r6', displayName: 'Pedro Fitness', username: 'fit_pedro', photoURL: '', level: 18, xp: 4800, streak: 5, points: 1820, trend: 'down', badges: ['streak7'] },
  { uid: 'r7', displayName: 'Julia Fit', username: 'julia_fit', photoURL: '', level: 16, xp: 4200, streak: 12, points: 1700, trend: 'up', badges: ['streak7'] },
  { uid: 'r8', displayName: 'Carlos Strong', username: 'carlos_strong', photoURL: '', level: 14, xp: 3600, streak: 3, points: 1550, trend: 'same', badges: [] },
  { uid: 'r9', displayName: 'Beatriz Health', username: 'bia_health', photoURL: '', level: 11, xp: 2100, streak: 6, points: 1380, trend: 'up', badges: [] },
  { uid: 'r10', displayName: 'Diego Muscle', username: 'diego_muscle', photoURL: '', level: 10, xp: 1800, streak: 2, points: 1200, trend: 'down', badges: [] },
];

const sampleChallenges = [
  { id: 'c1', title: '30 Dias de Treino', description: 'Treine todos os dias por 30 dias', icon: '🏋️', type: 'treino', duration: 30, participants: 1247, progress: 12, reward: 500, color: '#00D4FF' },
  { id: 'c2', title: 'Hidratação Master', description: 'Beba 3L de água por dia', icon: '💧', type: 'saúde', duration: 14, participants: 892, progress: 8, reward: 200, color: '#39FF14' },
  { id: 'c3', title: 'Cardio Challenge', description: '150min de cardio por semana', icon: '🏃', type: 'cardio', duration: 7, participants: 634, progress: 3, reward: 150, color: '#FF6B35' },
  { id: 'c4', title: 'Clean Eating', description: 'Registre todas as refeições no NutriScan', icon: '🥗', type: 'nutrição', duration: 21, participants: 445, progress: 5, reward: 300, color: '#A855F7' },
];

export const useRankingStore = create((set, get) => ({
  leaderboard: sampleRanking,
  challenges: sampleChallenges,
  userRank: 5,
  userPoints: 1950,
  period: 'weekly',
  isLoading: false,

  setPeriod: (period) => set({ period }),

  fetchLeaderboard: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, level, xp, streak, badges')
        .order('xp', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const users = data.map((u) => ({
          uid: u.id,
          displayName: u.display_name,
          username: u.username,
          photoURL: u.avatar_url || '',
          level: u.level || 1,
          xp: u.xp || 0,
          streak: u.streak || 0,
          points: u.xp || 0,
          trend: 'same',
          badges: u.badges || [],
        }));
        set({ leaderboard: users, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchChallenges: async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        set({ challenges: data });
      }
    } catch {
      // Keep sample challenges
    }
  },

  joinChallenge: async (challengeId) => {
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, participants: c.participants + 1, joined: true } : c
      ),
    }));

    // Persist to Supabase
    try {
      await supabase.from('challenge_participants').insert({
        challenge_id: challengeId,
        user_id: 'current-user-id', // Would use actual user ID
      });
    } catch {
      // Silently fail for demo
    }
  },

  updateProgress: (challengeId, newProgress) => {
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, progress: newProgress } : c
      ),
    }));
  },

  addPoints: (amount) => {
    set((state) => ({ userPoints: state.userPoints + amount }));
  },
}));
